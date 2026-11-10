import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { createArchiveRoom } from "./archiveRoom";
import { viewpoints } from "./viewpoints";

export default function RoomCanvas({
  onReady,
  onError,
  onProgress,
  controlRef,
  reducedMotion,
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
      disposed = false,
      failed = false,
      dirty = true,
      ready = false;
    let frame = 0,
      lastTime = 0,
      transition = null,
      imported = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.03, 100);
    const keys = new Set();
    const movement = new THREE.Vector2();
    const forward = new THREE.Vector3(),
      right = new THREE.Vector3(),
      delta = new THREE.Vector3();
    const callbacks = [];
    let currentView = viewpoints[0];
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
      currentView = view;
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
      camera.fov = width < 600 ? 77 : 65;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const initialize = async () => {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(
          Math.min(
            devicePixelRatio,
            matchMedia("(pointer: coarse)").matches ? 1 : 1.35,
          ),
        );
        renderer.setClearColor(0xf0f2ef, 1);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.95;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const environmentGenerator = new THREE.PMREMGenerator(renderer);
        const environmentRoom = new RoomEnvironment();
        environmentTarget = environmentGenerator.fromScene(
          environmentRoom,
          0.04,
        );
        scene.environment = environmentTarget.texture;
        scene.environmentIntensity = 0.65;
        environmentRoom.dispose();
        environmentGenerator.dispose();
        // Architecture and lights are static: camera movement can reuse the shadow map.
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
        const canvas = renderer.domElement;
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
        scene.add(spark);
        controls = new OrbitControls(camera, canvas);
        controls.enableDamping = false;
        controls.enablePan = true;
        controls.minDistance = 0.65;
        controls.maxDistance = 11;
        controls.minPolarAngle = 0.28;
        controls.maxPolarAngle = Math.PI * 0.79;
        controls.rotateSpeed = 0.45;
        controls.panSpeed = 0.65;
        controls.zoomSpeed = 0.55;
        controls.addEventListener("change", () => {
          dirty = true;
        });
        controls.addEventListener("start", () => {
          transition = null;
        });
        moveTo(viewpoints[0], true);
        resize();
        room = createArchiveRoom({ onProgress });
        scene.add(room);
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
            keys.add(e.code);
            transition = null;
          }
          if (e.code === "KeyR") moveTo(currentView);
        });
        listen(canvas, "keyup", (e) => keys.delete(e.code));
        listen(canvas, "blur", () => {
          keys.clear();
          movement.set(0, 0);
        });
        listen(window, "blur", () => {
          keys.clear();
          movement.set(0, 0);
        });
        listen(window, "resize", resize);
        listen(document, "visibilitychange", () => {
          keys.clear();
          movement.set(0, 0);
          dirty = true;
          lastTime = performance.now();
        });
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        callbacks.push(() => observer.disconnect());
        const tick = (time) => {
          if (disposed || failed) return;
          frame = requestAnimationFrame(tick);
          const dt = Math.min((time - (lastTime || time)) / 1000, 0.045);
          lastTime = time;
          if (document.hidden) return;
          if (transition) {
            const p = Math.min(1, (time - transition.started) / 1700),
              ease = p * p * (3 - 2 * p);
            camera.position.lerpVectors(transition.from, transition.to, ease);
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
            const limit = imported ? 12 : 5.45;
            camera.position.x = THREE.MathUtils.clamp(
              camera.position.x,
              -limit,
              limit,
            );
            camera.position.z = THREE.MathUtils.clamp(
              camera.position.z,
              imported ? -12 : -4.2,
              imported ? 12 : 4.7,
            );
            controls.target.add(camera.position.clone().sub(before));
            controls.update();
            dirty = true;
          }
          if (dirty) {
            try {
              renderer.render(scene, camera);
              dirty = false;
              canvas.dataset.camera = camera.position
                .toArray()
                .map((n) => n.toFixed(3))
                .join(",");
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
            if (!imported)
              moveTo(viewpoints.find((v) => v.id === id) || viewpoints[0]);
          },
          reset: () =>
            moveTo(
              imported
                ? { position: [0, 0.5, 5.5], target: [0, 0, 0] }
                : viewpoints[0],
            ),
          move: (x, z) => {
            transition = null;
            movement.set(x, z);
          },
          focus: () => canvas.focus({ preventScroll: true }),
          loadCapture: async (file) => {
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
        canvas.dataset.scene = "gaussian-archive";
        canvas.dataset.splats = String(
          room.splats?.getNumSplats() || room.packedSplats?.numSplats || 0,
        );
        onProgress(100);
        onReady();
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
      renderer?.dispose();
      renderer?.forceContextLoss();
      if (renderer?.domElement.parentNode === host)
        host.removeChild(renderer.domElement);
    };
  }, []);
  return <div className="spatial-canvas" ref={hostRef} />;
}
