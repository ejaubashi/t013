# Perspective room transfers and spatial navigation

The November 2026 interface revision keeps the minimal ivory gallery and replaces the soft full-screen room blend with a perspective aperture. The old room moves around the projected doorway while the destination opens inside it. A bounded scene-depth correction adds foreground parallax. The destination settles onto its exact live camera before handoff.

The transfer is image reprojection, not a reconstruction of hidden geometry. Its deliberately small depth offsets avoid the disocclusion holes that aggressive reprojection would expose. Navigation without a visible connecting door opens a centered aperture with the same perspective treatment. Close doorways keep their actual off-screen corners, and first-person doorway previews use the visitor’s eye height.

## Rendering

- Capture the existing linear HDR image and scene depth together. Store linear view-space depth in the alpha channel of each half-float history image; no extra full-size history textures are required.
- Preserve the complete projected doorway quadrilateral with an inverse homography. Interpolate its corners toward a slightly oversized viewport, and rectify the arrival image continuously.
- Use quintic timing with zero endpoint velocity and acceleration. The first frame equals the source; the last frame equals the arrival image.
- Capture the destination once per transfer. The animation uses a single full-screen compositing draw on the software tier. Hardware keeps the existing bloom, output conversion, and antialiasing passes.
- Reset depth validity after an interrupted composition because two overlaid rooms have no single geometric depth. The next live scene capture restores it.
- Retain immediate reduced-motion navigation, Skip and Escape, resize cancellation, dialog interruption, and hidden-tab handling.

The room island offers four direct destinations, small illustrations, visited state, hover/focus context, and access to the full native atlas. Collection, Walk/Views, and Controls share one bottom dock. Walk/Views changes use native View Transitions with separate shared elements for the dock and its persistent controls. The document API captures only the named tools, with the root and canvas excluded. Unsupported browsers and reduced motion use the direct update. The native enhancement is tested in both navigation directions and with the API disabled. Native dialogs retain focus management and keyboard behavior. CSS `linear()` spring timing and `@starting-style` progressively enhance the interface; ordinary cubic-bezier timing remains the fallback.

## Primary sources consulted

Reviewed 15 November 2026:

- [Three.js depth texture example](https://github.com/mrdoob/three.js/blob/r180/examples/webgl_depth_texture.html): depth texture setup and perspective-depth conversion, matching the installed renderer.
- [Three.js RenderTarget implementation](https://github.com/mrdoob/three.js/blob/r180/src/core/RenderTarget.js): independent cloned depth textures and multisample depth resolution.
- [CSS View Transitions Level 2](https://github.com/w3c/csswg-drafts/blob/main/css-view-transitions-2/Overview.bs): snapshot capture and rendering suppression. Scene snapshots would suppress the continuously rendered canvas; room transfer stays in the renderer, while scoped/shared-element transitions are reserved for the tools.
- [MDN Document.startViewTransition](https://github.com/mdn/content/blob/main/files/en-us/web/api/document/startviewtransition/index.md): same-document transition callbacks and progressive enhancement.
- [MDN ViewTransition types](https://github.com/mdn/content/blob/main/files/en-us/web/api/viewtransition/types/index.md): selective UI snapshots and progressive enhancement.
- [MDN CSS linear()](https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/values/easing-function/linear/index.md): piecewise timing curves with a cubic-bezier fallback.
- [MDN @starting-style](https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/at-rules/@starting-style/index.md): entry styles for the mounted route caption.
- [MDN Element.animate](https://github.com/mdn/content/blob/main/files/en-us/web/api/element/animate/index.md): native Web Animations used by the existing focus-safe dialogs and panels.

## Browser implementation choice

A trial of element-scoped captures aborted during this layout change in Chromium 156 with a prepaint validation error. The delivered dock uses the document API with only its named controls captured. The 3D transfer remains entirely in the renderer. Chromium’s [prepaint validation](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/view_transition/view_transition_style_tracker.cc) was inspected while diagnosing that behavior.

## Return point

`checkpoint-before-spatial-interface` preserves the published minimal gallery at `644446a`.
