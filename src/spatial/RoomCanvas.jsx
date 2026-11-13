import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { createArchiveRoom } from "./archiveRoom";
import { viewpoints } from "./viewpoints";
import { createPavilionEnvironment } from "./pavilionMaterials";
import { exhibits } from "./exhibits";
import { artworks, artworkSize, artworkView } from "./artworks";
import { journey } from "./journey";
import { rooms, roomForView } from "./rooms";
import { RoomTransitionPass, roomTransitions, smoothTravel } from "./roomTransitions";
import { PortalPreviews } from "./portalPreviews";
import { WalkController, eyeHeight, isWalkable, walkPosition, walkView } from "./walkNavigation";

export default function RoomCanvas({
  onReady,
  onError,
  onProgress,
  controlRef,
  reducedMotion,
  onJourneyChange,
  onExhibitSelect,
  onArtworkSelect,
  onExhibitPositions,
  onRoomChange,
  onRoomTransition,
  onInteractionChange,
  onNavigationChange,
  onWalkInput,
}) {
  const hostRef = useRef(null);
  const motionRef = useRef(reducedMotion);
  useEffect(() => {
    motionRef.current = reducedMotion;
  }, [reducedMotion]);
  useEffect(() => {
    const host = hostRef.current;
    let renderer,
      spark,
      room,
      controls,
      environmentTarget,
      composer,
      scenePass,
      antialiasPass,
      transitionPass,
      portalPreviews,
      disposed = false,
      failed = false,
      dirty = true,
      ready = false,
      announced = false;
    let frame = 0,
      lastTime = 0,
      transition = null,
      lightingTransition = null,
      artTransition = null,
      artPhase = 2,
      lightLevel = 0,
      journeyState = null,
      orbiting = false,
      imported = false;
    let activeRoom = "pavilion";
    let spectrum = 0.5;
    let roomTravel = null, interruptedTravel = false, suppressNextTap = false;
    let viewportWidth = 0, viewportHeight = 0;
    let wasInteracting = false;
    let navigationMode = "walk", walker, arrival = null, lookPointer = null, floorMarker;
    const fieldOfView = () => navigationMode === "walk" ? (host.clientWidth < 600 ? 78 : 64) : (host.clientWidth < 600 ? 72 : 52);
    const announceNavigation = () => onNavigationChange?.({ mode: navigationMode, arriving: Boolean(arrival) });
    const cancelArrival = () => { if (arrival) { arrival = null; walker?.sync(); announceNavigation(); dirty = true; } };
    const setNavigationMode = (mode) => {
      if (navigationMode === mode) return;
      navigationMode = mode; controls.enabled = mode === "views";
      walker?.sync(); camera.fov = fieldOfView(); camera.updateProjectionMatrix();
      if (floorMarker) floorMarker.visible = false;
      announceNavigation(); dirty = true;
    };
    const previewKey = () => `${lightLevel.toFixed(2)}:${activeRoom === "pavilion" ? "static" : artPhase.toFixed(2)}:${activeRoom === "garden" ? spectrum : 0}:${room?.userData.assetVersion || 0}`;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.03, 100);
    const keys = new Set();
    const movement = new THREE.Vector2();
    const forward = new THREE.Vector3(),
      right = new THREE.Vector3(),
      delta = new THREE.Vector3();
    const callbacks = [];
    let currentView = viewpoints[0];
    const stopJourney = () => {
      cancelArrival(); walker?.halt();
      dirty = true;
      if (floorMarker) floorMarker.visible = false;
      finishRoomTravel(true);
      if (!journeyState) return;
      journeyState = null;
      transition = null;
      dirty = true;
      onJourneyChange?.(null);
    };
    const listen = (target, type, listener, options) => {
      target.addEventListener(type, listener, options);
      callbacks.push(() => target.removeEventListener(type, listener, options));
    };
    const fail = (message) => {
      if (disposed || failed) return;
      failed = true;
      ready = false;
      onError(message);
    };
    const finishRoomTravel = (interrupted = false) => {
      if (!roomTravel) return;
      const travel = roomTravel;
      camera.position.set(...travel.view.position);
      controls.target.set(...travel.view.target);
      camera.fov = fieldOfView();
      camera.updateProjectionMatrix();
      controls.update();
      walker?.sync();
      roomTravel = null;
      transitionPass.finish(renderer);
      scenePass.enabled = true;
      interruptedTravel = interrupted;
      onRoomTransition?.({ active: false, from: travel.from, to: travel.to });
      dirty = true;
    };
    const moveTo = (view, instant = false) => {
      if (!controls) return;
      cancelArrival(); walker?.halt();
      setNavigationMode(view.walk ? "walk" : "views");
      if (roomTravel) finishRoomTravel(true);
      const nextRoom = roomForView(view);
      if (!imported && room && nextRoom !== activeRoom) {
        const from = activeRoom;
        const profile = roomTransitions[`${from}:${nextRoom}`];
        const animate = !instant && !motionRef.current && transitionPass?.hasHistory;
        const corners = animate ? portalPreviews.corners(from, nextRoom, camera, camera.aspect, !interruptedTravel) : null;
        activeRoom = nextRoom;
        room.userData.setRoom(activeRoom);
        renderer.shadowMap.needsUpdate = true;
        keys.clear(); movement.set(0, 0);
        // A cached arrival must include any presentation change already
        // requested by the visitor, rather than freezing a half-lit artwork.
        if (artTransition) setArtForm(artTransition.to, true);
        if (lightingTransition) setLighting(lightingTransition.to, true);
        if (animate && transitionPass.begin(profile, corners)) {
          roomTravel = { from, to: nextRoom, view, profile, elapsed: 0, progress: 0, lastFrameTime: null, sceneDraws: 0 };
          // The shader supplies the glide. Capture the exact final viewpoint
          // once so the live 3D scene resumes without a second camera move.
          camera.position.set(...view.position); controls.target.set(...view.target);
          camera.fov = fieldOfView();
          camera.updateProjectionMatrix(); controls.update();
          walker?.sync();
          currentView = view;
          transition = null; interruptedTravel = false;
          onRoomChange?.({ id: activeRoom, view: view.id });
          onRoomTransition?.({ active: true, from, to: nextRoom, effect: profile.effect });
          dirty = true;
          return;
        }
      }
      interruptedTravel = false;
      currentView = view;
      if (!imported && room) onRoomChange?.({ id: activeRoom, view: view.id });
      const position = new THREE.Vector3(...view.position),
        target = new THREE.Vector3(...view.target);
      if (instant || motionRef.current || (camera.position.distanceToSquared(position) < 1e-8 && controls.target.distanceToSquared(target) < 1e-8)) {
        camera.position.copy(position);
        controls.target.copy(target);
        controls.update();
        walker?.sync();
        transition = null;
      } else
        transition = {
          from: camera.position.clone(),
          to: position,
          fromTarget: controls.target.clone(),
          toTarget: target,
          started: performance.now(),
          walk: Boolean(view.walk),
        };
      dirty = true;
    };
    const enterRoom = (id, instant = false) => {
      if (!ready || imported) return;
      const destination = rooms.find((item) => item.id === id);
      if (!destination) return;
      stopJourney();
      moveTo(navigationMode === "walk" ? walkView(id) : viewpoints.find((view) => view.id === destination.entry), instant);
    };
    const approachDoor = (id) => {
      if (!ready || imported) return;
      if (navigationMode !== "walk" || motionRef.current) { enterRoom(id); return; }
      const portal = rooms.find((item) => item.id === activeRoom).portals.find((item) => item.to === id);
      if (!portal) return;
      stopJourney(); onWalkInput?.();
      const point = new THREE.Vector3(portal.position[0], eyeHeight, portal.position[2] + 1);
      if (walker.go(point)) {
        floorMarker.position.set(point.x, 0.035, point.z); floorMarker.visible = true; dirty = true;
      }
    };
    const resize = () => {
      if (!renderer || disposed) return;
      const width = host.clientWidth,
        height = host.clientHeight;
      if (!width || !height) return;
      if (roomTravel && viewportWidth && (width !== viewportWidth || height !== viewportHeight)) finishRoomTravel(true);
      viewportWidth = width; viewportHeight = height;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.fov = fieldOfView();
      camera.updateProjectionMatrix();
      composer?.setSize(width, height);
      antialiasPass?.uniforms.resolution.value.set(
        1 / (width * renderer.getPixelRatio()),
        1 / (height * renderer.getPixelRatio()),
      );
      dirty = true;
    };
    const setLighting = (night, instant = false) => {
      if (imported) return;
      if (instant || motionRef.current) {
        lightLevel = Number(night);
        room.userData.setLighting(lightLevel);
        scene.environmentIntensity = night ? 0.18 : 0.38;
        lightingTransition = null;
      } else lightingTransition = { from: lightLevel, to: Number(night), started: performance.now() };
      renderer.domElement.dataset.lighting = night ? "night" : "day";
      dirty = true;
    };
    const setArtForm = (form, instant = false) => {
      if (imported) return;
      const next = THREE.MathUtils.clamp(Number(form), 0, 2);
      if (instant || motionRef.current) {
        artPhase = next;
        room.userData.setArtPhase(artPhase);
        artTransition = null;
      } else artTransition = { from: artPhase, to: next, started: performance.now(), duration: 1500 };
      dirty = true;
    };
    const showJourneyStep = (index) => {
      if (index >= journey.length) { stopJourney(); return; }
      const step = journey[Math.max(0, index)];
      journeyState = { index: Math.max(0, index), remaining: null };
      keys.clear(); movement.set(0, 0);
      moveTo(viewpoints.find((view) => view.id === step.view));
      setArtForm(step.form, Boolean(roomTravel));
      setLighting(step.night, Boolean(roomTravel));
      onJourneyChange?.({ index: journeyState.index, ...step });
    };
    const initialize = async () => {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
        const gl = renderer.getContext();
        const graphicsInfo = gl.getExtension("WEBGL_debug_renderer_info");
        const graphicsName = graphicsInfo
          ? gl.getParameter(graphicsInfo.UNMASKED_RENDERER_WEBGL)
          : "";
        const softwareGraphics = /swiftshader|llvmpipe|softpipe|software/i.test(graphicsName);
        renderer.transmissionResolutionScale = softwareGraphics ? 0.3 : 0.65;
        renderer.setPixelRatio(
          Math.min(
            devicePixelRatio,
            softwareGraphics ? 1 : matchMedia("(pointer: coarse)").matches ? 1.5 : 1.35,
          ),
        );
        renderer.setClearColor(0x172325, 1);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const environmentGenerator = new THREE.PMREMGenerator(renderer);
        const environmentRoom = createPavilionEnvironment();
        environmentTarget = environmentGenerator.fromScene(
          environmentRoom,
          0.04,
        );
        scene.environment = environmentTarget.texture;
        scene.environmentIntensity = 0.38;
        environmentRoom.traverse((object) => {
          object.geometry?.dispose();
          object.material?.dispose();
        });
        environmentGenerator.dispose();
        // Architecture and lights are static: camera movement can reuse the shadow map.
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
        const canvas = renderer.domElement;
        canvas.dataset.renderMode = softwareGraphics ? "balanced" : "detail";
        canvas.tabIndex = 0;
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          "Navigable 3D gallery. Drag to look. Scroll or click the floor to walk. Use W A S D to move and Q E to turn.",
        );
        host.appendChild(canvas);
        spark = new SparkRenderer({
          renderer,
          onDirty: () => {
            dirty = true;
          },
          maxStdDev: Math.sqrt(5),
          minPixelRadius: 0.4,
        });
        spark.layers.set(1);
        camera.layers.enable(1);
        scene.add(spark);
        controls = new OrbitControls(camera, canvas);
        controls.enableDamping = false;
        controls.enablePan = true;
        controls.minDistance = 0.65;
        controls.maxDistance = 26;
        controls.minPolarAngle = 0.28;
        controls.maxPolarAngle = Math.PI * 0.79;
        controls.rotateSpeed = 0.45;
        controls.panSpeed = 0.65;
        controls.zoomSpeed = 0.55;
        controls.enabled = false;
        walker = new WalkController(camera, controls.target, () => activeRoom);
        controls.addEventListener("change", () => {
          dirty = true;
        });
        controls.addEventListener("start", () => {
          suppressNextTap = Boolean(roomTravel);
          orbiting = true;
          stopJourney();
          transition = null;
        });
        controls.addEventListener("end", () => { orbiting = false; });
        moveTo(walkView(), true);
        resize();
        const raycaster = new THREE.Raycaster();
        raycaster.layers.set(3);
        const cursor = new THREE.Vector2();
        const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const floorPoint = new THREE.Vector3();
        floorMarker = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.215, 48),
          new THREE.MeshBasicMaterial({ color: 0xe3edc9, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
        floorMarker.rotation.x = -Math.PI / 2; floorMarker.visible = false; scene.add(floorMarker);
        const pointOnFloor = (event) => {
          const rect = canvas.getBoundingClientRect();
          cursor.set(((event.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((event.clientY - rect.top) / rect.height) * 2);
          raycaster.setFromCamera(cursor, camera);
          const point = raycaster.ray.intersectPlane(floor, floorPoint);
          return point && point.distanceTo(camera.position) < 24 && isWalkable(point, activeRoom) ? point : null;
        };
        const interruptWalk = () => {
          if (arrival || journeyState || roomTravel) stopJourney();
          if (transition) { transition = null; walker.sync(); }
          onWalkInput?.();
        };
        const activePointers = new Set();
        let pointerDown = null;
        const pickExhibit = (event) => {
          if (!ready || imported) return null;
          const rect = canvas.getBoundingClientRect();
          cursor.set(((event.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((event.clientY - rect.top) / rect.height) * 2);
          raycaster.setFromCamera(cursor, camera);
          return raycaster.intersectObjects(room.userData.hitTargets || [], false)[0]?.object.userData;
        };
        listen(canvas, "pointerdown", (event) => {
          activePointers.add(event.pointerId);
          pointerDown = activePointers.size === 1 ? [event.clientX, event.clientY] : null;
          if (navigationMode === "walk" && ready && !imported) {
            suppressNextTap = Boolean(roomTravel);
            interruptWalk(); walker.halt();
            lookPointer = activePointers.size === 1 ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
            canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
            orbiting = true;
          }
        });
        listen(canvas, "pointermove", (event) => {
          if (navigationMode === "walk" && ready && !imported) {
            if (lookPointer?.id === event.pointerId && activePointers.size === 1) {
              walker.look(event.clientX - lookPointer.x, event.clientY - lookPointer.y, event.pointerType === "touch");
              lookPointer.x = event.clientX; lookPointer.y = event.clientY; dirty = true;
            } else if (!activePointers.size && !roomTravel && !arrival) {
              const point = pickExhibit(event) ? null : pointOnFloor(event);
              if (!walker.route.length) {
                canvas.dataset.walkFloor = point ? `${point.x.toFixed(3)},${point.z.toFixed(3)}` : "none";
                floorMarker.visible = Boolean(point);
                if (point) floorMarker.position.set(point.x, 0.035, point.z);
                dirty = true;
              }
            }
          }
          if (!pointerDown) canvas.style.cursor = pickExhibit(event) ? "pointer" : "grab";
        });
        listen(canvas, "pointerup", (event) => {
          const isTap = activePointers.size === 1 && pointerDown && Math.hypot(event.clientX - pointerDown[0], event.clientY - pointerDown[1]) < 7;
          activePointers.delete(event.pointerId);
          pointerDown = null;
          lookPointer = null;
          if (!activePointers.size) orbiting = false;
          if (!isTap || suppressNextTap) { suppressNextTap = false; return; }
          const selected = pickExhibit(event);
          if (selected) {
            stopJourney();
            if (selected.portal) approachDoor(selected.portal);
            else if (selected.artwork) onArtworkSelect?.(selected.artwork);
            else if (selected.exhibit) onExhibitSelect?.(selected.exhibit);
          } else if (navigationMode === "walk" && !imported) {
            const point = pointOnFloor(event);
            if (point && walker.go(point, motionRef.current)) {
              floorMarker.position.set(point.x, 0.035, point.z); floorMarker.visible = !motionRef.current; dirty = true;
            }
          }
        });
        listen(canvas, "pointercancel", (event) => { activePointers.delete(event.pointerId); pointerDown = null; lookPointer = null; orbiting = false; });
        listen(canvas, "pointerleave", () => { if (!walker.route.length) { floorMarker.visible = false; dirty = true; } });
        listen(canvas, "wheel", (event) => {
          if (navigationMode !== "walk" || !ready || imported) return;
          event.preventDefault(); interruptWalk();
          walker.wheel(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? host.clientHeight : 1));
          canvas.focus({ preventScroll: true }); dirty = true;
        }, { passive: false });
        listen(window, "keydown", (event) => { if (event.code === "Escape") stopJourney(); });
        room = createArchiveRoom({
          onProgress,
          ...(softwareGraphics ? { reflectionSize: 512, reflectionSamples: 0, balancedLighting: true } : {}),
        });
        artPhase = motionRef.current ? 2 : 1;
        room.userData.setArtPhase(artPhase);
        scene.add(room);
        const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
          type: THREE.HalfFloatType,
          samples: softwareGraphics ? 0 : 2,
        });
        composer = new EffectComposer(renderer, renderTarget);
        scenePass = new RenderPass(scene, camera);
        composer.addPass(scenePass);
        transitionPass = new RoomTransitionPass({ balanced: softwareGraphics });
        composer.addPass(transitionPass);
        portalPreviews = new PortalPreviews({ renderer, scene, room, balanced: softwareGraphics, onDirty: () => { dirty = true; } });
        if (!softwareGraphics)
          composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.45, 1.5));
        composer.addPass(new OutputPass());
        antialiasPass = new ShaderPass(FXAAShader);
        composer.addPass(antialiasPass);
        resize();
        const fullPixelRatio = renderer.getPixelRatio();
        let motionQuality = "idle";
        const updateMotionQuality = (moving) => {
          const tier = roomTravel ? "travel" : moving ? "motion" : "idle";
          if (motionQuality === tier) {
            if (!canvas.dataset.motion) canvas.dataset.motion = moving ? "active" : "idle";
            return;
          }
          motionQuality = tier;
          canvas.dataset.motion = moving ? "active" : "idle";
          if (softwareGraphics) {
            renderer.setPixelRatio(fullPixelRatio * (tier === "travel" ? 0.6 : moving ? navigationMode === "walk" ? 0.6 : 0.7 : 1));
            composer.setPixelRatio(renderer.getPixelRatio());
            resize();
          }
        };
        listen(canvas, "webglcontextlost", (e) => {
          e.preventDefault();
          fail(
            "The 3D view was interrupted. You can retry or continue with the original experience.",
          );
        });
        listen(canvas, "keydown", (e) => {
          if (
            [
              "KeyW",
              "KeyA",
              "KeyS",
              "KeyD",
              "ArrowUp",
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
              "KeyQ", "KeyE",
            ].includes(e.code)
          ) {
            e.preventDefault();
            if (!keys.has(e.code)) {
              if (navigationMode === "walk") { interruptWalk(); walker.route = []; }
              else stopJourney();
            }
            keys.add(e.code);
            transition = null;
          }
          if (e.code === "KeyR") { stopJourney(); moveTo(currentView); }
        });
        listen(canvas, "keyup", (e) => keys.delete(e.code));
        listen(canvas, "blur", () => {
          keys.clear();
          movement.set(0, 0);
        });
        listen(window, "blur", () => {
          keys.clear();
          movement.set(0, 0);
          orbiting = false;
          activePointers.clear(); pointerDown = null;
          lookPointer = null; walker.halt();
        });
        listen(window, "resize", resize);
        listen(document, "visibilitychange", () => {
          if (document.hidden) cancelArrival();
          keys.clear();
          movement.set(0, 0);
          orbiting = false;
          activePointers.clear(); pointerDown = null;
          lookPointer = null; walker.halt();
          dirty = true;
          lastTime = performance.now();
          if (roomTravel) roomTravel.lastFrameTime = null;
        });
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        callbacks.push(() => observer.disconnect());
        const tick = (time) => {
          if (disposed || failed) return;
          frame = requestAnimationFrame(tick);
          const elapsed = (time - (lastTime || time)) / 1000;
          const dt = Math.min(elapsed, 0.045);
          lastTime = time;
          if (document.hidden) return;
          const interacting = Boolean(orbiting || keys.size || movement.lengthSq() || navigationMode === "walk" && walker.moving);
          if (interacting !== wasInteracting) { wasInteracting = interacting; onInteractionChange?.(interacting); }
          const modalOpen = Boolean(document.querySelector("dialog[open]"));
          if ((journeyState || roomTravel || arrival || walker.moving) && modalOpen) stopJourney();
          if (roomTravel && motionRef.current) finishRoomTravel(true);
          if (journeyState && !transition && !roomTravel && !artTransition && !lightingTransition) {
            if (journeyState.remaining === null) journeyState.remaining = 6.5;
            else journeyState.remaining -= Math.min(elapsed, 1);
            if (journeyState.remaining <= 0) showJourneyStep(journeyState.index + 1);
          }
          updateMotionQuality(Boolean(orbiting || keys.size || movement.lengthSq() || transition || roomTravel || arrival || walker.moving || artTransition || lightingTransition));
          let finishAfterDraw = false;
          if (roomTravel) {
            // The capture can compile a room's materials. Start the motion
            // clock on the following frame, after that one-time work finishes.
            if (transitionPass.prepared) {
              if (roomTravel.lastFrameTime !== null) roomTravel.elapsed += Math.max(0, time - roomTravel.lastFrameTime);
              roomTravel.lastFrameTime = time;
            }
            const p = Math.min(1, roomTravel.elapsed / roomTravel.profile.duration);
            roomTravel.progress = p;
            transitionPass.setProgress(p);
            finishAfterDraw = p === 1;
            dirty = true;
          }
          if (artTransition) {
            const p = Math.min(1, (time - artTransition.started) / artTransition.duration);
            artPhase = THREE.MathUtils.lerp(artTransition.from, artTransition.to, p * p * (3 - 2 * p));
            room.userData.setArtPhase?.(artPhase);
            dirty = true;
            if (p === 1) artTransition = null;
          }
          if (lightingTransition) {
            const p = Math.min(1, (time - lightingTransition.started) / 750);
            lightLevel = THREE.MathUtils.lerp(lightingTransition.from, lightingTransition.to, p * p * (3 - 2 * p));
            room.userData.setLighting?.(lightLevel);
            scene.environmentIntensity = THREE.MathUtils.lerp(0.38, 0.18, lightLevel);
            dirty = true;
            if (p === 1) lightingTransition = null;
          }
          if (transition) {
            const p = Math.min(1, (time - transition.started) / 1700),
              ease = smoothTravel(p);
            camera.position.lerpVectors(transition.from, transition.to, ease);
            // A shallow camera arc adds lift while keeping both endpoints exact.
            if (!transition.walk) camera.position.y += Math.sin(ease * Math.PI) * 0.32;
            controls.target.lerpVectors(
              transition.fromTarget,
              transition.toTarget,
              ease,
            );
            controls.update();
            dirty = true;
            if (p === 1) { transition = null; walker.sync(); }
          }
          if (arrival) {
            // Shader compilation and Spark's first sort can outlast an intro.
            // Begin only after the rendered room has actually been announced.
            if (announced && arrival.started === null) arrival.started = time;
            const p = motionRef.current ? 1 : arrival.started === null ? 0 : Math.min(1, (time - arrival.started) / 4400);
            camera.position.lerpVectors(arrival.from, arrival.to, smoothTravel(p));
            controls.target.copy(arrival.target); controls.update(); dirty = true;
            if (p === 1) { arrival = null; walker.sync(); announceNavigation(); }
          }
          const x =
            movement.x +
            Number(keys.has("KeyD") || navigationMode === "views" && keys.has("ArrowRight")) -
            Number(keys.has("KeyA") || navigationMode === "views" && keys.has("ArrowLeft"));
          const z =
            movement.y +
            Number(keys.has("KeyW") || keys.has("ArrowUp")) -
            Number(keys.has("KeyS") || keys.has("ArrowDown"));
          if (ready && navigationMode === "walk" && !transition && !roomTravel && !arrival && !modalOpen) {
            const turn = Number(keys.has("KeyQ") || keys.has("ArrowLeft")) - Number(keys.has("KeyE") || keys.has("ArrowRight"));
            if (walker.moving || x || z || turn) {
              dirty = walker.update(Math.min(elapsed, 0.25), x, z, turn, motionRef.current) || dirty;
              if (floorMarker.visible && !walker.route.length) { floorMarker.visible = false; dirty = true; }
              const door = rooms.find((item) => item.id === activeRoom).portals.find((portal) =>
                camera.position.z < -8.4 && Math.hypot(camera.position.x - portal.position[0], camera.position.z - portal.position[2]) < 1.35);
              if (door) enterRoom(door.to);
            }
          }
          if (ready && navigationMode === "views" && (x || z)) {
            camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();
            right.crossVectors(forward, camera.up).normalize();
            delta
              .copy(forward)
              .multiplyScalar(z)
              .addScaledVector(right, x)
              .normalize()
              .multiplyScalar(dt * 1.65);
            const before = camera.position.clone();
            camera.position.add(delta);
            const limit = imported ? 12 : 9.4;
            camera.position.x = THREE.MathUtils.clamp(
              camera.position.x,
              -limit,
              limit,
            );
            camera.position.z = THREE.MathUtils.clamp(
              camera.position.z,
              imported ? -12 : -6.7,
              imported ? 12 : 12.5,
            );
            controls.target.add(camera.position.clone().sub(before));
            controls.update();
            dirty = true;
          }
          if (dirty) {
            try {
              // Spark can request another frame while rendering completes its
              // initial sort. Preserve that request instead of clearing it.
              dirty = false;
              const walkingMotion = navigationMode === "walk" && Boolean(arrival || walker.moving || orbiting || keys.size || movement.lengthSq() || transition);
              if (!imported && !roomTravel) portalPreviews.update(camera, activeRoom, previewKey(), time, false, walkingMotion);
              scenePass.enabled = !roomTravel || !transitionPass.prepared;
              const renderStage = !roomTravel ? "scene" : scenePass.enabled ? "capture" : "composite";
              const cameraLayers = camera.layers.mask;
              // Stable photographic planes keep navigation light. Spark returns
              // at rest; paintings, architecture, and lights remain fully 3D.
              if (announced && !imported && !roomTravel && walkingMotion) { camera.layers.disable(1); camera.layers.enable(2); }
              // Keep archive images complete while Spark prepares its sort on
              // re-entry. These native photo planes sit on the same exhibits.
              if (roomTravel && scenePass.enabled && activeRoom === "pavilion" && !spark.activeSplats) camera.layers.enable(2);
              try {
                if (softwareGraphics && roomTravel && transitionPass.prepared) transitionPass.renderToDisplay(renderer);
                else composer.render();
              }
              finally { camera.layers.mask = cameraLayers; }
              if (roomTravel) {
                roomTravel.sceneDraws += Number(scenePass.enabled);
                canvas.dataset.transitionSceneDraws = String(roomTravel.sceneDraws);
                canvas.dataset.transitionFrames = String(transitionPass.frames);
              }
              const drawnProgress = roomTravel?.progress ?? 1;
              if (finishAfterDraw) finishRoomTravel();
              canvas.dataset.drawnSplats = String(spark.activeSplats);
              canvas.dataset.roomTransition = roomTravel ? "travelling" : "idle";
              canvas.dataset.transitionRenderer = renderStage;
              canvas.dataset.transitionProgress = drawnProgress.toFixed(3);
              canvas.dataset.transitionRoute = roomTravel ? `${roomTravel.from}:${roomTravel.to}` : canvas.dataset.transitionRoute || "none";
              canvas.dataset.transitionEffect = roomTravel?.profile.effect || canvas.dataset.transitionEffect || "none";
              canvas.dataset.livePortals = imported ? "0" : String(portalPreviews.count);
              canvas.dataset.room = imported ? "capture" : activeRoom;
              canvas.dataset.navigation = navigationMode;
              canvas.dataset.motionRepresentation = walkingMotion ? "photographic" : "splats";
              canvas.dataset.arrival = arrival ? "entering" : "complete";
              canvas.dataset.walkRoute = String(walker.route.length);
              canvas.dataset.walkSpeed = walker.velocity.length().toFixed(3);
              if (!imported) {
                const batches = room.userData.staticBatches[activeRoom];
                canvas.dataset.staticBatches = `${batches.before}:${batches.after}`;
              }
              canvas.dataset.look = `${camera.rotation.x.toFixed(4)},${camera.rotation.y.toFixed(4)}`;
              canvas.dataset.petals = !imported && activeRoom === "garden" ? String(room.userData.petalCount || 0) : "0";
              canvas.dataset.mirrors = !imported && activeRoom === "pavilion" ? String(room.userData.mirrorCount || 0) : "0";
              canvas.dataset.artwork = imported ? "capture" : { pavilion: "afterimage", orbit: "golden-orbits", garden: "petal-cloud", prism: "spectral-crystals" }[activeRoom];
              canvas.dataset.crystals = !imported && activeRoom === "prism" ? String(room.userData.crystalCount) : "0";
              canvas.dataset.wallArtworks = imported ? "0" : String(artworks.filter((art) => art.room === activeRoom).length);
              canvas.dataset.artworkView = currentView.artwork || "none";
              canvas.dataset.spectrum = spectrum.toFixed(2);
              canvas.dataset.lightLevel = lightLevel.toFixed(3);
              if (!imported) {
                canvas.dataset.artPhase = artPhase.toFixed(3);
                canvas.dataset.artForm = artPhase < 0.001 ? "ribbon" : Math.abs(artPhase - 1) < 0.001 ? "constellation" : artPhase > 1.999 ? "bloom" : "transforming";
              }
              canvas.dataset.journey = journeyState ? String(journeyState.index) : "stopped";
              const markers = activeRoom === "pavilion" ? exhibits.map((exhibit) => {
                const point = new THREE.Vector3(exhibit.x + exhibit.width / 2 - 0.18, 2.75, -7.43).project(camera);
                return { id: exhibit.id, x: (point.x + 1) * host.clientWidth / 2, y: (1 - point.y) * host.clientHeight / 2,
                  visible: camera.position.z > -7.43 && point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.94 && Math.abs(point.y) < 0.88 };
              }) : [];
              for (const portal of rooms.find((item) => item.id === activeRoom).portals) {
                const point = new THREE.Vector3(...portal.position).add(new THREE.Vector3(0, -1.65, 0.2)).project(camera);
                markers.push({ id: `portal-${portal.to}`, room: portal.to, x: (point.x + 1) * host.clientWidth / 2, y: (1 - point.y) * host.clientHeight / 2,
                  visible: camera.position.z > portal.position[2] && point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.91 && Math.abs(point.y) < 0.85 });
              }
              if (!imported) for (const art of artworks.filter((item) => item.room === activeRoom)) {
                const { width, height } = artworkSize(art);
                const anchor = new THREE.Vector3(width / 2 - 0.15, -height / 2 + 0.15, 0.18)
                  .applyAxisAngle(new THREE.Vector3(0, 1, 0), art.rotation).add(new THREE.Vector3(...art.position));
                const point = anchor.project(camera);
                markers.push({ id: `artwork-${art.id}`, artwork: art.id,
                  x: (point.x + 1) * host.clientWidth / 2, y: (1 - point.y) * host.clientHeight / 2,
                  visible: camera.position.x > art.position[0] + 0.2 && point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.93 && Math.abs(point.y) < 0.86 });
              }
              onExhibitPositions?.(imported || roomTravel ? [] : markers);
              canvas.dataset.camera = camera.position
                .toArray()
                .map((n) => n.toFixed(3))
                .join(",");
              if (ready && !announced && spark.activeSplats > 0) {
                announced = true;
                onProgress(100);
                onReady();
              }
            } catch (error) {
              fail(
                "Your graphics device could not render this room. Try the original experience instead.",
              );
              console.error(error);
            }
          }
        };
        frame = requestAnimationFrame(tick);
        controlRef.current = {
          navigate: (id) => {
            stopJourney();
            if (!imported)
              moveTo(viewpoints.find((v) => v.id === id) || viewpoints[0]);
          },
          enterRoom: (id, { instant = false } = {}) => {
            enterRoom(id, instant);
          },
          approachDoor,
          setNavigation: (mode) => {
            if (!ready || imported || !["walk", "views"].includes(mode) || mode === navigationMode) return;
            stopJourney();
            if (mode === "walk") {
              const position = walkPosition(camera.position, activeRoom), direction = camera.getWorldDirection(new THREE.Vector3());
              direction.y = THREE.MathUtils.clamp(direction.y, -0.5, 0.5); direction.normalize();
              moveTo({ id: rooms.find((item) => item.id === activeRoom).entry, room: activeRoom, walk: true,
                position: position.toArray(), target: position.clone().addScaledVector(direction, 6).toArray() });
            } else moveTo(viewpoints.find((view) => view.id === rooms.find((item) => item.id === activeRoom).entry));
          },
          inspectArtwork: (id) => {
            if (!ready || imported) return;
            const art = artworks.find((item) => item.id === id);
            if (!art) return;
            stopJourney();
            moveTo({ ...artworkView(art), artwork: art.id });
          },
          skipRoomTransition: () => finishRoomTravel(true),
          reset: () => {
            stopJourney();
            moveTo(
              imported
                ? { position: [0, 0.5, 5.5], target: [0, 0, 0] }
                : navigationMode === "walk" ? walkView(activeRoom) : viewpoints.find((view) => view.id === rooms.find((item) => item.id === activeRoom).entry),
            );
          },
          move: (x, z) => {
            if ((x || z) && !movement.lengthSq()) {
              stopJourney(); if (transition) { transition = null; walker.sync(); } onWalkInput?.();
            }
            movement.set(x, z);
          },
          focus: () => canvas.focus({ preventScroll: true }),
          setLighting: (night) => { stopJourney(); setLighting(night); },
          setArtForm: (form) => { stopJourney(); setArtForm(form); },
          setSpectrum: (value) => {
            if (imported) return;
            stopJourney();
            spectrum = THREE.MathUtils.clamp(Number(value), 0, 1);
            room.userData.setSpectrum(spectrum);
            dirty = true;
          },
          startJourney: () => { if (ready && !imported) showJourneyStep(0); },
          stopJourney,
          advanceJourney: (direction) => { if (journeyState) showJourneyStep(journeyState.index + direction); },
          loadCapture: async (file) => {
            stopJourney();
            const next = new SplatMesh({
              fileBytes: await file.arrayBuffer(),
              fileName: file.name,
              lod: false,
            });
            try {
              await next.initialized;
              if (disposed) {
                next.dispose();
                return;
              }
              if (!next.splats?.getNumSplats())
                throw new Error("The capture is empty.");
              const bounds = next.getBoundingBox(true),
                center = bounds.getCenter(new THREE.Vector3());
              if (![center.x, center.y, center.z].every(Number.isFinite))
                throw new Error("The capture has invalid bounds.");
              const size = bounds.getSize(new THREE.Vector3()),
                scale = 7 / Math.max(size.x, size.y, size.z, 0.001);
              next.scale.setScalar(scale);
              next.position.copy(center).multiplyScalar(-scale);
              portalPreviews?.dispose();
              portalPreviews = null;
              if (transitionPass) {
                composer.removePass(transitionPass);
                transitionPass.dispose();
                transitionPass = null;
              }
              scene.remove(room);
              room.dispose();
              room = next;
              scene.add(room);
              imported = true;
              lightingTransition = null;
              artTransition = null;
              canvas.dataset.artForm = "capture";
              canvas.dataset.mirrors = "0";
              scene.environmentIntensity = 0.38;
              controls.maxDistance = 18;
              moveTo({ position: [0, 0.5, 5.5], target: [0, 0, 0] }, true);
              canvas.dataset.splats = String(
                room.splats?.getNumSplats() ||
                  room.packedSplats?.numSplats ||
                  0,
              );
              dirty = true;
            } catch (error) {
              next.dispose();
              throw error;
            }
          },
          flip: () => {
            const axis = new THREE.Vector3(0, 0, 1);
            room.rotateOnWorldAxis(axis, Math.PI);
            room.position.applyAxisAngle(axis, Math.PI);
            dirty = true;
          },
        };
        await room.initialized;
        if (disposed) {
          room.dispose();
          return;
        }
        ready = true;
        dirty = true;
        if (!motionRef.current) {
          artPhase = 1;
          room.userData.setArtPhase(artPhase);
          artTransition = { from: 1, to: 2, started: performance.now(), duration: 3100 };
          const entrance = walkView("pavilion", true), destination = walkView();
          camera.position.set(...entrance.position);
          controls.target.set(...destination.target);
          controls.update();
          walker.sync();
          arrival = { from: camera.position.clone(), to: new THREE.Vector3(...destination.position),
            target: new THREE.Vector3(...destination.target), started: null };
          announceNavigation();
        }
        canvas.dataset.scene = "gaussian-archive";
        canvas.dataset.lighting = "day";
        canvas.dataset.mirrors = String(room.userData.mirrorCount || 0);
        canvas.dataset.splats = String(
          room.splats?.getNumSplats() || room.packedSplats?.numSplats || 0,
        );
        onProgress(98);
      } catch (error) {
        console.error(error);
        fail(
          "This device could not start the 3D room. You can retry or open the original experience.",
        );
      }
    };
    initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      keys.clear();
      controlRef.current = null;
      callbacks.forEach((remove) => remove());
      controls?.dispose();
      floorMarker?.geometry.dispose(); floorMarker?.material.dispose();
      portalPreviews?.dispose();
      room?.dispose();
      spark?.dispose();
      environmentTarget?.dispose();
      composer?.passes.forEach((pass) => pass.dispose());
      composer?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      if (renderer?.domElement.parentNode === host)
        host.removeChild(renderer.domElement);
    };
  }, []);
  return <div className="spatial-canvas" ref={hostRef} />;
}
