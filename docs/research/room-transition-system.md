# Room-to-room transitions: research and implementation

Research date: 13 November 2026.

## Current references

The following current upstream source files were retrieved and read before implementation. The npm registry's latest endpoints reported Three.js **0.187.0**, Drei **10.7.9**, and camera-controls **3.1.2** on the research date. This identifies the versions checked, not a universal ranking of transition systems. The gallery retains its tested Three.js 0.180 / Spark 2.4 dependencies; the relevant render-target and postprocessing APIs already exist there, so this change does not require a renderer/framework migration.

| Reference | What was inspected | Application here |
| --- | --- | --- |
| [Drei MeshPortalMaterial](https://github.com/pmndrs/drei/blob/master/src/core/MeshPortalMaterial.tsx) | Destination render textures, visibility-based updates, blending with a full-screen quad, and the cost of SDF preparation | Render actual destination views inside doorways. Cache quiet views and update visible portals when camera or exhibit state changes. Use a GPU aperture to expand a destination into the viewport. |
| [Three.js portal example](https://github.com/mrdoob/three.js/blob/master/examples/webgl_portal.html) | Portal cameras, portal-frame projection, render-target state restoration, hidden self-surfaces, and shadow/XR state handling | Keep destination previews isolated, suppress recursive portal/reflection passes, and restore renderer and visibility state in `finally`. Use projected doorway corners to anchor the transfer. |
| [Three.js RenderTransitionPass](https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/RenderTransitionPass.js) | Two render targets, shader composition, half-float buffers, transition thresholds, resizing, and disposal | Add a native transition pass before bloom and output conversion. Retain the displayed composition for interruption and preserve the HDR colour pipeline. |
| [camera-controls](https://github.com/yomotsu/camera-controls/blob/master/readme.md) | `setLookAt`, `lerpLookAt`, rest detection, stop behavior, SmoothDamp, and chained transitions | Coordinate camera position and look target, provide exact arrival poses, and let manual controls interrupt. Use a bounded Bézier arrival with a smooth timing curve rather than adding a second camera controller. |
| [CSS View Transitions Level 2](https://github.com/w3c/csswg-drafts/blob/main/css-view-transitions-2/Overview.bs) | Captured old/new states and the transition pseudo-element model | Assessed for the HTML interface. The room effect stays in the renderer so the incoming 3D scene, exposure, bloom, and camera remain coordinated. |

This study uses primary implementation sources and a browser specification. It does not claim live testing of external showcase websites or visitor research.

## Design

Every ordered pair of the four rooms has a route: **twelve directions**. All entrances use the same controller, whether selected through a physical doorway, a projected marker, the atlas, or the guided journey.

The visual treatment follows the destination:

- **Lumen Pavilion:** ivory light and fine radial filaments, recalling the mirrored Bloom.
- **Orbit Hall:** amber edges and concentric orbital light.
- **Sky Garden:** a soft mint aperture with a woven boundary.
- **Prism Chamber:** a spectral edge with restrained chromatic refraction.

The origin supplies the starting tint and each route has a stable directional seed. This creates a related visual language instead of twelve unrelated page effects. There is no black curtain or mandatory audio cue.

A transfer opens from the projected doorway when it is in view. Atlas routes without a visible doorway use a central aperture. The outgoing frame is reprojected toward the opening while the incoming room remains live and its camera follows a Bézier arrival. The nominal duration is approximately 2.45–2.61 seconds. Exact room viewpoints are retained when travel completes.

The technique is a cinematic portal transfer, not a continuously connected building or a recursive geometric portal simulation. The outgoing HDR composition is cached and reprojected; it is not rendered by a second Spark camera. Destination previews use bounded, parallax-sensitive exhibit cameras rather than an unrestricted off-axis world transform.

## Rendering and interaction

Small doorway views are rendered from the actual room geometry, lighting, current artwork, and native photo planes. Spark retains its single main-camera sort. Preview cameras exclude the Spark renderer and use the same archive image surrogates as the existing reflection camera. Planar mirrors and nested portal surfaces are suppressed in preview passes to keep recursion and cost bounded.

The transition pass runs before bloom, tone mapping, and final antialiasing. Two GPU history targets retain the outgoing and latest displayed compositions, so a replacement route can start from what was visible. Their storage stays stable during DPR changes and resize; room geometry renders normally again when the transfer finishes. All extra render targets, materials, and timers are disposed with the viewer.

Only visible doorways update. Still views are cached, and software graphics use smaller portal buffers with a slower update budget. Their transition render resolution and history storage are also reduced, then the normal scene resolution returns on arrival. Travel follows visible elapsed time rather than requiring a fixed number of expensive software-rendered frames. The destination's doorway views are prepared during arrival so they are already populated when the new room takes over.

A compact route caption names the destination and offers **Skip**. Atlas navigation, Escape, orbit/walk input, reset, and imported captures can finish an in-progress transfer cleanly. The guided reading interval waits until room and camera transitions finish. Hidden tabs pause the travel clock. Reduced motion switches rooms immediately and keeps the same final pose and navigation actions.

## Checkpoint

The previous atlas and Prism Chamber version is saved at `checkpoint-before-portal-transitions`, commit `18916e6`.

## Validation

- `npm run build -- --base=/t013/` passed.
- The 32 existing regression checks and six new transition checks passed across serial Playwright runs. The new checks cover all twelve directions on desktop and mobile, live previews, rendered intermediate frames, exact arrivals, physical canvas door selection, guided travel, replacement routes, Escape, Skip, resize, walking after travel, and reduced motion. Atlas keyboard focus and imported-capture checks were also rerun after the relevant changes.
- Animation checks install a frame-state observer before navigation and disable DOM trace snapshots. This avoids the observation delays caused by tracing WebGL on software Chromium while retaining assertions about intermediate rendered states and the visible Skip action.
- The production preview at `/t013/` passed at 1200 × 800 and 390 × 664. All four destination effects were inspected, native content dialogs finished travel cleanly, the atlas could start a tour from another room, automatic tour advancement waited for arrival, and the original testimony video loaded. No page/console errors or failed production asset responses were recorded.
- The detail composer, including bloom and multisampled HDR buffers, was exercised on the available software GPU. A separate DPR-2 check verified travel and exact arrival, rejected the composer's DPR-scaled one-pixel bootstrap target, and retained correctly sized history buffers through subsequent resolution changes.

These browser checks use software Chromium, including a forced detail-rendering branch. Physical GPU and mobile-device performance have not been measured; the cache and resolution budgets are implementation limits rather than measured frame-rate guarantees.
