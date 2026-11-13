# An atlas of light: interface and optical installation

Research and implementation: 12 November 2026.

The subsequent live doorway and room-transfer implementation is documented in [Room-to-room transitions](room-transition-system.md).

The current floating dock, animated atlas, phone sheet, and focus behavior are documented in [A quieter interface that follows the visitor](fluid-spatial-interface.md).

## Sources and method

This is a primary-source implementation study, not a ranking of museum websites or a visitor study. The following public READMEs, source files, and accessibility example were retrieved and read. Their principles informed the design; their frameworks were not added as dependencies.

| Source | What was inspected | Decision for this project |
| --- | --- | --- |
| [14islands / r3f-scroll-rig](https://github.com/14islands/r3f-scroll-rig/blob/master/README.md) | Progressive enhancement, one shared canvas, DOM elements as the interface, viewport and resource considerations | Keep one existing canvas. Use native HTML for discovery and reading, with illustrated SVG room previews instead of four additional WebGL contexts. |
| [React Three A11y](https://github.com/pmndrs/react-three-a11y/blob/main/README.md) | Focus indication, descriptive buttons, keyboard activation, screen reader equivalents for 3D actions | Every room has a named HTML entry action. Canvas doorways retain projected buttons. The spectrum control is a native range input. Focus is restored when leaving the atlas or art view. |
| [W3C ARIA Practices: modal dialog example](https://github.com/w3c/aria-practices/blob/main/content/patterns/dialog-modal/examples/dialog.html) | Initial focus, focus remaining within a dialog, visible focus, return focus, and avoiding focus on the entire dialog | Use a native `dialog` for the atlas, with a labelled heading and initially focused close button. Escape closes it. The close button stays visible while its contents scroll. |
| [Three.js MeshPhysicalMaterial, r180](https://github.com/mrdoob/three.js/blob/r180/src/materials/MeshPhysicalMaterial.js) | Volume transmission, thickness, index of refraction, and dispersion | Use native physical transmission and dispersion on seven original crystal forms. Refraction uses the renderer's shared transmission buffer. |
| [Drei MeshTransmissionMaterial](https://github.com/pmndrs/drei/blob/master/src/core/MeshTransmissionMaterial.tsx) | Chromatic aberration, sample count, local buffers, resolution, and extra cost of backside rendering | Control buffer cost and avoid an additional custom backside pass. Native Three.js is sufficient here; a React Three Fiber migration would add complexity without helping the interaction. |

## Interface audit

The previous interface had several competing navigation groups, tiny room labels, and an always-visible movement pad. This made space discovery harder to understand and covered the artwork on narrow screens. These are design observations from inspecting the implementation and desktop/mobile renders, not measured visitor outcomes.

The revision establishes three levels:

1. **Discover:** Explore the rooms opens a warm, editorial atlas with four illustrated room cards, a schematic floor plan on wider screens, the current room, and explored-room indicators. Mobile uses the larger room cards to preserve readable labels and touch targets.
2. **Experience:** A persistent guided-journey action, larger viewpoint labels, horizontally scrollable mobile viewpoints, and a clear route into Benno's testimony. Room headings give way to the artwork when a close-up viewpoint is selected.
3. **Adjust:** A single Controls disclosure contains lighting, the pavilion's three forms, the Prism spectrum, reset, help, local capture import, and walking controls. Advanced tools are available when requested.

**Just the art** hides the exhibition interface and the surrounding header/footer while keeping an explicit exit action. Escape returns to the interface and restores focus. This is an interface mode, not a browser fullscreen request. The room atlas stops the guided journey rather than allowing it to move behind a dialog.

The floor plan is an authored navigation diagram, not the plan of a real building. Room illustrations are original SVG artwork. Historical photographs and testimony remain separate from the imagined architecture and abstract installations.

## Prism Chamber

A fourth room adds seven suspended crystal forms, a spectral backlight, a coloured oculus, and a procedural light pattern on the floor. **Move the light** changes the spectrum field, light colours, ray orientation, and a small rotation of the installation. No continuous animation is needed while the visitor is still.

The crystals use Three.js volume transmission, dispersion, thickness, and an index of refraction of 1.48. The transmission buffer runs at 65% of render dimensions on the detail tier and 30% on software graphics. These are screen-space effects rather than full path tracing. The coloured floor field and light wedges are authored shader/geometry effects, not physically calculated caustics. There are no external scene downloads, generated historical pictures, or new runtime packages.

The guided journey has twelve stops across four rooms. Direct links such as `?view=spatial&room=prism` enter a specific room after the gallery initializes, even when the original cover was selected previously. Reduced motion retains immediate camera/art changes; no audio or testimony starts automatically.

## Checkpoint and review

The prior three-room version is saved at `checkpoint-before-atlas-prism`, commit `b2ab6c3`. The original paper experience remains available through Original view.

## Validation

The GitHub Pages production build passes with `npm run build -- --base=/t013/`. The local production check uses `npm run preview -- --base=/t013/` so the server matches the deployed asset prefix.

Browser verification covered all 32 desktop/mobile cases. The full regression run passed the original experience, twelve guided stops, room navigation, splat drawing, lighting, walking, imports, and fallback. The atlas/Prism and art-view photo-reader cases were rerun after the final focus changes; all four affected desktop/mobile cases passed. Coverage includes native dialog focus, Escape, keyboard room selection, spectrum Home/End keys, art-view focus restoration, opening a photograph from art view, explicit spatial deep links, and horizontal overflow.

A separate production smoke check exercised normal camera transitions, a direct canvas click on the physical doorway into Sky Garden, automatic journey advancement, stopping the journey for the atlas, and testimony video loading under `/t013/`. No browser errors or failed HTTP assets were reported. Mobile review at 390 × 664 checked the atlas close button after scrolling, the spectrum slider, art view, return focus from the canvas, and overflow. The detail-tier pipeline was also rendered successfully in software Chromium with bloom, multisampling, and physical transmission. Physical mobile GPU performance remains unmeasured.

The mode switch uses one persistent visible button for entering and leaving art view. This avoids restoring keyboard focus to a control while it is hidden or being replaced. Selecting a photograph also leaves art view before opening its reader.
