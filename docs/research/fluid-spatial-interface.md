# A quieter interface that follows the visitor

Research and implementation: 13 November 2026.

This revision applies current interaction patterns to this gallery. It is a primary-source implementation study, not a universal ranking of websites or a visitor study. The source files below were retrieved and read before implementation; no new animation framework was added.

## References and decisions

| Primary reference | What was inspected | Application here |
| --- | --- | --- |
| [Motion: layout projection](https://github.com/motiondivision/motion/blob/main/packages/motion-dom/src/projection/node/create-projection-node.ts) | Measured layout, target deltas, transform projection, and animation interruption | A single selection surface follows the active viewpoint. Its bounds update on selection/layout changes; React does not update it on every animation frame. |
| [Radix: Popover](https://github.com/radix-ui/primitives/blob/main/packages/react/popover/src/popover.tsx) | Nonmodal focus behavior, outside interaction, trigger handling, and close autofocus | Controls closes on outside interaction without moving focus away from the canvas. Escape returns focus to its trigger. The native details element remains the disclosure primitive. |
| [Vaul: drawer implementation](https://github.com/emilkowalski/vaul/blob/main/src/index.tsx) | Pointer capture, drag distance/velocity, modal behavior, and restoration | The phone atlas is a bottom sheet. Dragging its header dismisses it by distance or velocity; a shorter drag settles back. Its scrolling body remains independent of the gesture area. |
| [W3C ARIA Practices: Toolbar](https://github.com/w3c/aria-practices/blob/main/content/patterns/toolbar/toolbar-pattern.html) | One Tab stop, roving focus, horizontal arrow keys, Home and End | Viewpoints form a labelled camera toolbar. Left/Right chooses the adjacent view; Home/End chooses an endpoint. The selected view stays reachable with one Tab stop. |
| [W3C ARIA Practices: Modal Dialog](https://github.com/w3c/aria-practices/blob/main/content/patterns/dialog-modal/dialog-modal-pattern.html) | Native modal focus, initial focus, Escape, visible close controls, and return focus | Atlas and photographs retain native dialogs. Focus stays inside during an exit, then returns to the opener. Room navigation begins only after the native dialog closes. |
| [Web Animations Level 1](https://github.com/w3c/csswg-drafts/blob/main/web-animations-1/Overview.bs) | Finished promises, cancellation, finished state, and timing | Entry and exit animations have an explicit lifecycle. Cancellation/unmount prevents delayed navigation; overlapping close requests are ignored. Reduced motion skips the animation and can finish one already running. |

## Design

The primary interface is a compact floating dock with a travelling selection highlight and a matching Controls surface. This replaces the full-width rectangular viewpoint strip and separates camera choices from adjustment tools. On phones, the dock scrolls horizontally, keeping useful labels rather than shrinking six controls into narrow targets. The active choice stays in view when the viewport changes. During loading, the progress state is shown before the controls appear; during room travel, Skip occupies a separate row above the dock.

The atlas uses four illustrated cards, room colour identities, a current-room state, and visit indicators. A schematic map remains available on larger screens; it describes navigation between imagined rooms rather than a real floor plan. On phones the same content becomes a sheet with a fixed header and footer, a scrolling body, a visible close button, and an optional header swipe. No gesture is required to navigate or dismiss it.

The interface softens while the visitor drags or walks in the scene and returns when interaction stops. Navigation remains visible, and a focused dock retains full emphasis. This is distinct from **Just the art**, which is still an explicit mode with a visible exit. The renderer reports interaction boundaries rather than streaming camera coordinates into React.

The room launcher now carries four small visit indicators. Short landscape layouts use a more compact hierarchy and omit duplicate projected doorway markers; the labelled atlas still offers every room, and physical door selection remains available. Photograph actions stay available.

## Motion and focus

Surfaces enter in about 260–320 ms and exit in 150–170 ms. Motion uses small transforms and opacity changes. The dock highlight moves between measured button positions, and press/hover feedback stays within the control's target area. Nothing follows the cursor away from its hit target, and no perpetual decorative animation is added.

The atlas closes before starting room travel. This avoids a native modal canceling the new room flight. The photograph reader uses the same exit sequence for return-to-room and testimony actions. Outside dismissal of Controls preserves the visitor's new focus; Escape deliberately restores its trigger. Native modal focus, labelled buttons, and the existing screen-reader room announcements remain in use.

Reduced motion skips JavaScript surface animations and makes the selection indicator immediate. A preference change finishes any surface animation already running. Touch dragging is directly controlled by the visitor and has an explicit close-button alternative.

## Rendering and scope

The accepted [fluid room-transfer system](room-transition-system.md) supplies the 3D transitions. This interface revision adds no WebGL contexts, scene assets, animation packages, or continuous React animation loop. Native HTML, SVG, CSS, and the Web Animations API provide the interface motion. Glass surfaces use small areas for the dock and adjustment panel; room imagery remains the main visual content.

The historical photographs and testimony retain their own reading experience. The new atlas illustrations describe the imagined gallery rather than historical locations.

## Checkpoint

The accepted room-transition version is saved at `checkpoint-before-fluid-interface`, commit `7381733`.

## Validation

- The GitHub Pages build passed with `npm run build -- --base=/t013/`.
- Twenty relevant desktop/mobile checks passed across serial Playwright runs: the four new interface checks, six room-transition checks, and ten existing checks for gallery navigation, all guided stops, native photo reading, atlas/art-view focus, and valid/invalid capture imports.
- Interface coverage includes one toolbar Tab stop, Left/Right and Home/End, selection-highlight alignment, keeping the selected view visible after resize, quiet exploration, outside dismissal preserving canvas focus, native modal exits, return focus, touch swipe dismissal, and Skip remaining reachable above the phone dock.
- Production checks at 1200 × 800 and 390 × 664 passed for the atlas, phone sheet, photo-reader animation, Controls, room transfers, tour start/stop and automatic advancement, content-dialog interruption, and original testimony playback. A 1440 × 900 / 900 × 540 visual review also checked the full and compact layouts.
- The detail rendering branch passed at DPR 2 on software Chromium. No page/console errors or failed production asset responses were recorded. Physical device/GPU performance has not been measured.

The final visual review corrected selected-label contrast and phone-sheet insets. Regression checks also caught two layout collisions: Controls covering Skip during travel and the imported-capture panel extending beyond a phone's edge. Both were corrected and the affected checks rerun successfully.
