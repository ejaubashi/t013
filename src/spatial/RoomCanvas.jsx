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
import { journey } from "./journey";
import { rooms, roomForView } from "./rooms";

export default function RoomCanvas({
  onReady,
  onError,
  onProgress,
  controlRef,
  reducedMotion,
  onJourneyChange,
  onExhibitSelect,
  onExhibitPositions,
  onRoomChange,
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
      antialiasPass,
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
    const moveTo = (view, instant = false) => {
      if (!controls) return;
      const nextRoom = roomForView(view);
      if (!imported && room && nextRoom !== activeRoom) {
        activeRoom = nextRoom;
        room.userData.setRoom(activeRoom);
        renderer.shadowMap.needsUpdate = true;
        keys.clear(); movement.set(0, 0);
        // A short reveal hides the scene exchange; the camera then settles
        // into the new room. Reduced motion goes directly to its endpoint.
        camera.position.set(view.position[0], view.position[1] + 0.18, view.position[2] + 1.2);
        controls.target.set(...view.target);
        controls.update();
      }
      currentView = view;
      if (!imported && room) onRoomChange?.({ id: activeRoom, view: view.id });
      const position = new THREE.Vector3(...view.position),
        target = new THREE.Vector3(...view.target);
      if (instant || motionRef.current) {
        camera.position.copy(position);
        controls.target.copy(target);
        controls.update();
        transition = null;
      } else
        transition = {
          from: camera.position.clone(),
          to: position,
          fromTarget: controls.target.clone(),
          toTarget: target,
          started: performance.now(),
        };
      dirty = true;
    };
    const resize = () => {
      if (!renderer || disposed) return;
      const width = host.clientWidth,
        height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.fov = width < 600 ? 72 : 52;
      camera.updateProjectionMatrix();
      composer?.setSize(width, height);
      antialiasPass?.uniforms.resolution.value.set(
        1 / (width * renderer.getPixelRatio()),
        1 / (height * renderer.getPixelRatio()),
      );
      dirty = true;
    };
    const setLighting = (night) => {
      if (imported) return;
      if (motionRef.current) {
        lightLevel = Number(night);
        room.userData.setLighting(lightLevel);
        scene.environmentIntensity = night ? 0.18 : 0.38;
        lightingTransition = null;
      } else lightingTransition = { from: lightLevel, to: Number(night), started: performance.now() };
      renderer.domElement.dataset.lighting = night ? "night" : "day";
      dirty = true;
    };
    const setArtForm = (form) => {
      if (imported) return;
      const next = THREE.MathUtils.clamp(Number(form), 0, 2);
      if (motionRef.current) {
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
      setArtForm(step.form);
      setLighting(step.night);
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
          "Navigable 3D archive. Drag to look, scroll to zoom, use W A S D to move.",
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
        controls.addEventListener("change", () => {
          dirty = true;
        });
        controls.addEventListener("start", () => {
          orbiting = true;
          stopJourney();
          transition = null;
        });
        controls.addEventListener("end", () => { orbiting = false; });
        moveTo(viewpoints[0], true);
        resize();
        const raycaster = new THREE.Raycaster();
        raycaster.layers.set(3);
        const cursor = new THREE.Vector2();
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
        });
        listen(canvas, "pointermove", (event) => {
          if (!pointerDown) canvas.style.cursor = pickExhibit(event) ? "pointer" : "grab";
        });
        listen(canvas, "pointerup", (event) => {
          const isTap = activePointers.size === 1 && pointerDown && Math.hypot(event.clientX - pointerDown[0], event.clientY - pointerDown[1]) < 7;
          activePointers.delete(event.pointerId);
          pointerDown = null;
          if (!isTap) return;
          const selected = pickExhibit(event);
          if (selected) {
            stopJourney();
            if (selected.portal) moveTo(viewpoints.find((view) => view.id === rooms.find((item) => item.id === selected.portal).entry));
            else if (selected.exhibit) onExhibitSelect?.(selected.exhibit);
          }
        });
        listen(canvas, "pointercancel", (event) => { activePointers.delete(event.pointerId); pointerDown = null; });
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
        composer.addPass(new RenderPass(scene, camera));
        if (!softwareGraphics)
          composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.45, 1.5));
        composer.addPass(new OutputPass());
        antialiasPass = new ShaderPass(FXAAShader);
        composer.addPass(antialiasPass);
        resize();
        const fullPixelRatio = renderer.getPixelRatio();
        let motionQuality = false;
        const updateMotionQuality = (moving) => {
          if (motionQuality === moving) {
            if (!canvas.dataset.motion) canvas.dataset.motion = moving ? "active" : "idle";
            return;
          }
          motionQuality = moving;
          canvas.dataset.motion = moving ? "active" : "idle";
          if (softwareGraphics) {
            renderer.setPixelRatio(moving ? fullPixelRatio * 0.7 : fullPixelRatio);
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
            ].includes(e.code)
          ) {
            e.preventDefault();
            stopJourney();
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
        });
        listen(window, "resize", resize);
        listen(document, "visibilitychange", () => {
          keys.clear();
          movement.set(0, 0);
          orbiting = false;
          activePointers.clear(); pointerDown = null;
          dirty = true;
          lastTime = performance.now();
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
          if (journeyState && document.querySelector("dialog[open]")) stopJourney();
          if (journeyState && !transition && !artTransition && !lightingTransition) {
            if (journeyState.remaining === null) journeyState.remaining = 6.5;
            else journeyState.remaining -= Math.min(elapsed, 1);
            if (journeyState.remaining <= 0) showJourneyStep(journeyState.index + 1);
          }
          updateMotionQuality(Boolean(orbiting || keys.size || movement.lengthSq() || transition || artTransition || lightingTransition));
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
              ease = p * p * (3 - 2 * p);
            camera.position.lerpVectors(transition.from, transition.to, ease);
            // A shallow camera arc adds lift while keeping both endpoints exact.
            camera.position.y += Math.sin(p * Math.PI) * 0.32;
            controls.target.lerpVectors(
              transition.fromTarget,
              transition.toTarget,
              ease,
            );
            controls.update();
            dirty = true;
            if (p === 1) transition = null;
          }
          const x =
            movement.x +
            Number(keys.has("KeyD") || keys.has("ArrowRight")) -
            Number(keys.has("KeyA") || keys.has("ArrowLeft"));
          const z =
            movement.y +
            Number(keys.has("KeyW") || keys.has("ArrowUp")) -
            Number(keys.has("KeyS") || keys.has("ArrowDown"));
          if (ready && (x || z)) {
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
              composer.render();
              canvas.dataset.drawnSplats = String(spark.activeSplats);
              canvas.dataset.room = imported ? "capture" : activeRoom;
              canvas.dataset.petals = !imported && activeRoom === "garden" ? String(room.userData.petalCount || 0) : "0";
              canvas.dataset.mirrors = !imported && activeRoom === "pavilion" ? String(room.userData.mirrorCount || 0) : "0";
              canvas.dataset.artwork = imported ? "capture" : activeRoom === "pavilion" ? "afterimage" : activeRoom === "orbit" ? "golden-orbits" : "petal-cloud";
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
              onExhibitPositions?.(imported ? [] : markers);
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
          enterRoom: (id) => {
            if (!ready || imported) return;
            const destination = rooms.find((item) => item.id === id);
            if (!destination) return;
            stopJourney();
            moveTo(viewpoints.find((view) => view.id === destination.entry));
          },
          reset: () => {
            stopJourney();
            moveTo(
              imported
                ? { position: [0, 0.5, 5.5], target: [0, 0, 0] }
                : viewpoints.find((view) => view.id === rooms.find((item) => item.id === activeRoom).entry),
            );
          },
          move: (x, z) => {
            if (x || z) { stopJourney(); transition = null; }
            movement.set(x, z);
          },
          focus: () => canvas.focus({ preventScroll: true }),
          setLighting: (night) => { stopJourney(); setLighting(night); },
          setArtForm: (form) => { stopJourney(); setArtForm(form); },
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
          camera.position.set(9, 4.5, 14);
          controls.target.set(0.8, 3.2, -2);
          controls.update();
          moveTo(viewpoints[0]);
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
