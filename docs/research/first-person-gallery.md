# An eye-level gallery visit

Research and implementation: 13 November 2026.

The previous opening presented an orbit camera and a row of composed views. Dragging revolved around a target, and the short opening animation could finish during loading. This revision makes walking the default: visitors enter at a consistent eye height, turn their head without changing position, and choose where to walk. Composed views remain an explicit alternative.

## Primary references reviewed

| Reference | Decision applied |
| --- | --- |
| [Three.js first-person example](https://github.com/mrdoob/three.js/blob/dev/examples/games_fps.html) | Separate looking from ground movement; retain a stable floor and constrain the visitor against the environment. The gallery does not need gravity, jumping, or a projectile/physics loop. |
| [Three.js PointerLockControls](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/PointerLockControls.js) | YXZ head rotation, pitch limits, and movement parallel to the ground. Dragging provides the web interaction without requiring cursor capture. |
| [Babylon.js UniversalCamera](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Cameras/universalCamera.pure.ts) | First-person navigation should support keyboard and touch as part of the same camera model. Phone walking and looking have separate controls. |
| [camera-controls](https://github.com/yomotsu/camera-controls/blob/master/src/CameraControls.ts) | Distinguish responsive drag motion from slower programmed movement, use explicit boundaries, and let visitor input interrupt camera automation. |
| [Three.js r180 MathUtils](https://github.com/mrdoob/three.js/blob/r180/src/math/MathUtils.js) | Exponential, elapsed-time damping for rotation and velocity. Displacement integrates that velocity analytically, so movement does not depend on the display's frame rate. |

These source implementations were retrieved and read before implementation. They inform this design; this is not a ranking of every current navigation product. No new rendering engine, physics package, or animation dependency is introduced.

## Interaction

The visitor enters at 1.72 scene units above the floor. A short forward arrival starts after the room has rendered and its controls are ready. It holds eye height and avoids the former elevated camera arc. Dragging, keyboard movement, scrolling, or **Explore now** interrupts it immediately. Reduced motion skips the automatic arrival.

**Walk** uses mouse/touch dragging to turn the head, W/A/S/D to move, Q/E or Left/Right to turn, and scrolling to move through the room. A floor marker shows reachable destinations; selecting the floor moves along a route around obstacles. Reduced motion moves directly to the selected floor destination. Pools, installations, benches, archive panels, and exterior walls constrain the visitor. Movement accelerates gently and settles after input ends; the view stays still at rest.

The phone thumbstick controls ground movement while the other hand controls the view. Pointer identity and capture keep these interactions independent. Releasing the looking finger must not release the walking thumb. Pointer cancellation, focus changes, hidden tabs, and dialogs stop unattended movement. Direction buttons remain available in Controls for keyboard or touch use.

The **Walk / Views** switch keeps free walking separate from composed inspection. The viewpoint dock appears in Views. Painting readers can still bring the visitor in front of a canvas; **Walk** returns smoothly to eye level while retaining the viewing direction. Selecting a physical doorway in Walk plans a route to its threshold; reaching it starts the existing fluid room transfer. Atlas choices keep their direct transfer behavior. Reduced motion uses immediate room changes. The artwork collection, original photographs, testimony, and local capture viewer remain available.

## Navigation surface

Ground footprints are authored for the four existing rooms, with clearance around the displayed geometry. Short swept steps prevent crossing a thin obstacle during a long frame. Floor routes use an eight-neighbour A* grid and visibility pruning. This keeps the path compact while preserving obstacle clearance. The navigation surface is independent of decorative light rays and splats.

Camera input and its interpolation live in the renderer loop. React receives navigation boundaries and the first visitor interaction; it does not receive every thumbstick, camera, or animation frame. The thumbstick's visual position uses CSS properties. The initial guidance disappears after use; the walking view removes the large static headline and always-visible viewpoint strip.

## Rendering while walking

Static opaque architectural boxes are merged by material and shadow behavior, baking their transforms into the room's coordinates. Glass, interactive planes, instanced light sculptures, animated crystals, lights, and splats retain their existing objects. The material objects remain shared, so the lighting controls still affect the batched architecture. A geometry check verifies unchanged world bounds and the exclusions.

Doorway previews reuse a rendered destination when only the viewing direction changes. During movement, their updates use a lower cadence, a small parallax threshold, and a shared update budget. Resting refreshes the exact destination views. The main walking pass uses the existing native photographic displays; Gaussian splats return at rest. Paintings and the rest of the gallery stay fully three-dimensional. Software graphics use a lower motion resolution and restore full resolution when still.

Ground movement integrates elapsed time with a 250 ms long-frame cap and short collision steps. The former 45 ms animation cap made stopping take too long on slow renderers; movement now uses its own time budget. Hidden tabs reset the movement state rather than carrying a large elapsed step into the next frame.

## Return point

The published wall-art version is saved at `checkpoint-before-first-person`, commit `7a67031`.

## Verification

The four checks in `npm run test:navigation` passed. They exercise obstacle avoidance in every room, complete routes, stable stopping, fixed eye height, head rotation without orbiting, equivalent movement at 30, 60, and 120 updates per second, and preserved architectural bounds.

Thirty-two desktop/mobile browser checks passed across serial Playwright runs:

- Eight first-person checks cover a visible arrival after loading, in-place head rotation, keyboard and wheel movement, stable stopping, reachable floor selection, all four rooms at eye height, painting inspection and return to walking, complete walks through physical doorways, arrival/path interruption, reduced motion, two-handed touch controls, partial touch release, and Skip.
- Two layout checks cover normal desktop, portrait phone, short landscape, and restoration after rotation. They verify that guidance, collection access, the thumbstick, and navigation controls remain separate. The visual review corrected a stretched collection button and a thumbstick collision in short windows.
- Sixteen existing collection/interface/transition checks cover all eight paintings, zoom and touch panning, modal focus, the viewpoint dock, all twelve directed room transfers, interruption, resizing, physical doors, and guided room transfers.
- Six existing archive checks cover all twelve guided stops, original photograph selection, testimony entry, and valid/invalid local capture loading.

The GitHub Pages build passed with `npm run build -- --base=/t013/`. Browser checks use software WebGL and mobile touch emulation. Physical device performance has not been measured.

Production-path checks at `/t013/` passed at 1440 × 900, 900 × 540, and 390 × 664, including a coarse-pointer landscape layout. They recorded nine distinct arrival poses after the controls became ready, all at the same eye height. The Pavilion's 123 eligible architectural boxes became 14 batches. Painting-to-wall navigation and return to walking also passed under the production base path. No page/console errors, failed asset responses, horizontal phone overflow, or final control overlap were recorded.
