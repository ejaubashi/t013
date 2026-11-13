# Room-to-room transitions: research and implementation

Research date: 13 November 2026.

## Current references

The following current upstream source files were retrieved and read before implementation. The npm registry's latest endpoints reported Three.js **0.187.0**, Drei **10.7.9**, and camera-controls **3.1.2** on the research date. This identifies the versions checked, not a universal ranking of transition systems. The gallery retains its tested Three.js 0.180 / Spark 2.4 dependencies; the relevant render-target and postprocessing APIs already exist there, so this change does not require a renderer/framework migration.

| Reference | What was inspected | Application here |
| --- | --- | --- |
| [Drei MeshPortalMaterial](https://github.com/pmndrs/drei/blob/master/src/core/MeshPortalMaterial.tsx) | Destination render textures, visibility-based updates, blending with a full-screen quad, and the cost of SDF preparation | Render actual destination views inside doorways. Cache quiet views and use captured endpoints for the full-screen room transfer. |
| [Three.js portal example](https://github.com/mrdoob/three.js/blob/master/examples/webgl_portal.html) | Portal cameras, portal-frame projection, render-target state restoration, hidden self-surfaces, and shadow/XR state handling | Keep doorway previews isolated and restore renderer/visibility state in `finally`. A visible doorway supplies the transfer's focal point. |
| [Three.js RenderTransitionPass](https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/RenderTransitionPass.js) | Two render targets, shader composition, half-float buffers, transition thresholds, resizing, and disposal | Retain the outgoing HDR composition, capture the exact arrival once, and animate a full-screen blend. Save the displayed composition on interruption. |
| [camera-controls](https://github.com/yomotsu/camera-controls/blob/master/readme.md) | `setLookAt`, `lerpLookAt`, rest detection, stop behavior, SmoothDamp, and chained transitions | Keep one navigation controller, exact arrival poses, manual interruption, and smooth timing within rooms. Room transfers use a shader glide between captured views rather than an additional camera controller. |
| [CSS View Transitions Level 2](https://github.com/w3c/csswg-drafts/blob/main/css-view-transitions-2/Overview.bs) | Captured old/new states and the transition pseudo-element model | Assessed for the HTML interface. The room effect stays in the renderer so the incoming 3D scene, exposure, bloom, and camera remain coordinated. |

This study uses primary implementation sources and a browser specification. It does not claim live testing of external showcase websites or visitor research.

## Design

Every ordered pair of the four rooms has a route: **twelve directions**. All entrances use the same controller, whether selected through a physical doorway, a projected marker, the atlas, or the guided journey.

The current treatment follows the destination with small variations of one motion language:

- **Lumen Pavilion:** an ivory undertone and a gentle push toward the doorway.
- **Orbit Hall:** a slight curved flow with an amber undertone.
- **Sky Garden:** soft vertical flow with a mint undertone.
- **Prism Chamber:** restrained chromatic separation at peak movement.

The origin supplies the starting tint and each route has a stable direction and seed. The full viewport blends continuously, with a small image-space glide and low-frequency distortion. Blur follows the derivative of a quintic timing curve, so both endpoints are sharp and stationary. The expanding picture frame, glowing outline, large arrival title, and progress bar have been removed.

A visible doorway supplies the focal point; atlas routes without one use the center. The nominal moving interval is approximately **1.25–1.33 seconds**, following destination capture. The destination is captured at its exact final camera position, target, and FOV. The live room resumes at that same pose, without another camera settling animation. Guided room changes capture the requested lighting and installation state so the handoff does not jump to a different artwork.

This is an image-based spatial transition, not a continuously connected building, depth-reprojected geometry, or a recursive portal simulation. Both views are captured from the actual 3D scene; the glide and lens blur during travel are image-space effects. This tradeoff removes scene complexity from the moving interval. Destination doorway previews retain their bounded, parallax-sensitive cameras.

## Rendering and interaction

Small doorway views are rendered from actual room geometry, lighting, artwork, and native photo planes. Spark retains its single main-camera sort. Preview cameras exclude Spark and use the same archive image surrogates as the existing reflection camera. Planar mirrors and nested portal surfaces are suppressed in these small preview passes. The full arrival capture uses the normal scene renderer, including its reflections and transmission. On pavilion re-entry, native photo planes can fill the images while Spark prepares its sort.

Three bounded half-float targets hold the outgoing image, arrival, and history. The arrival needs **one scene draw per transfer**. Subsequent motion frames skip the scene RenderPass, reflection updates, portal previews, and Spark sorting. The detail tier retains bloom, tone mapping, and antialiasing in its composer. Software graphics combine the image blend, ACES tone mapping, and sRGB conversion into one screen draw; normal full-quality output returns on arrival.

The motion shader and buffers are warmed before navigation. History is saved at handoff or interruption rather than copied on every motion frame. Storage stays stable during drawing-resolution changes. A real viewport resize finishes travel immediately to avoid stretching captured images. Render targets, the extra output material, and preview timers are disposed with the viewer.

A quiet single-line caption names the destination and offers **Skip**. Atlas navigation, Escape, orbit/walk input, reset, and imported captures finish an in-progress transfer cleanly. Guided reading intervals wait for arrival. Hidden tabs pause the motion clock. Reduced motion switches rooms immediately with the same final pose and navigation actions.

## Checkpoint

The previous framed portal treatment is saved at `checkpoint-before-fluid-transitions`, commit `a7cfba2`. The earlier atlas and Prism Chamber version is saved at `checkpoint-before-portal-transitions`, commit `18916e6`.

## Validation

- A paired 1440 × 900 software-Chromium observation of pavilion → orbit recorded **2 intermediate states before and 40 after**. The old moving-frame intervals were approximately 750–810 ms; the new median was approximately **33 ms**. These are observations from this machine, not a hardware frame-rate guarantee. The one-time room capture still has a preparation cost and is excluded from that moving-frame comparison.
- Animation checks install a frame-state observer before navigation and disable DOM trace snapshots, which otherwise perturb GPU timing in software Chromium. They require intermediate frames in both halves of travel, the compositor path, one scene draw, exact arrival, and a visible Skip action.

- `npm run build -- --base=/t013/` passed. All six transition tests passed on desktop/mobile, including every directed pair, frames in both halves of the blend, one scene draw, physical doors, guided travel, interruption, resize, and reduced motion.
- Eight relevant existing desktop/mobile checks passed: real splats and original-view navigation, all twelve guided stops, valid/invalid imported captures, and atlas/art-view keyboard focus.
- The production preview at `/t013/` passed at 1200 × 800 and 390 × 664, with all four treatments inspected. A same-turn lighting/artwork-change check confirmed that the arrival captured the requested final state. Native content-dialog interruption, automatic tour advancement, atlas tour start/stop, and original testimony playback also passed.
- The detail composer passed at DPR 2 with bloom, tone mapping, antialiasing, and multisampled HDR buffers. No page/console errors or failed production asset responses were recorded.

These browser checks use software Chromium, including a forced detail-rendering branch. Physical GPU and mobile-device performance have not been measured; the cache and resolution budgets are implementation limits rather than measured frame-rate guarantees.
