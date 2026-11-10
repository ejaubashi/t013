# Research: an exceptional Benno’s Light experience

Research date: 10 November 2026. This is a design and engineering proposal. The application and deployment configuration have not been changed, and nothing has been pushed or deployed for this research.

## Recommendation

Build a cinematic archive with a physical 3D paper cover, one continuous camera journey into a chapter, and photographs that emerge through ink spreading across paper. Use restrained photographic depth and spatial sound to give the archive presence.

These elements share a visual language: paper, light, ink, memory, and voice. Three carefully connected signature moments would give the project a stronger identity than a large collection of unrelated effects.

The existing plum-and-cream typography is a useful foundation. The largest change would be the experience of moving between views: a document becomes a space, a photograph becomes the entrance to a memory, and the testimony remains the focus.

## What I checked

- Read the current Three.js, React Three Fiber, GSAP, Lenis, and Spark documentation/source, plus MDN documentation and compatibility data.
- Inspected Bruno Simon’s 2025 portfolio source and official preview image for scene architecture, lighting, rendering, and asset preparation.
- Downloaded the public Codrops Seam Transitions example and ran three variations locally in Chromium: Ink, Typeset, and Fray. All three rendered their canvas effects and scrolled without JavaScript errors in that test.
- The reference test used desktop Chromium with software WebGL rendering and external requests blocked. It demonstrates the effects, not mobile hardware performance or production readiness. External fonts were unavailable in that local test.
- Source revision for the locally tested Codrops demo: `54ce5b6480b0502e0afa8781a6130b84638b77a3`.

Some reference techniques predate 2026. They are included for their quality and suitability; current rendering tools can support a much more refined execution.

## Ranked implementation directions

| Priority | Direction | What the visitor experiences | Complexity | Media needed |
| --- | --- | --- | --- | --- |
| 1 | Physical 3D paper | The cover bends, lifts, and casts a changing shadow as it opens. Sheets separate with weight and spring. | High | Clean cover textures; paper detail maps |
| 2 | Continuous camera choreography | Selecting a chapter lifts its sheet toward the camera; the photograph on it becomes the full-screen testimony view. | Very high | A coherent set of chapter images and opening film frames |
| 3 | Ink and paper reveals | An archival image spreads through the page’s fibres, with irregular edges and a denser ink rim. | High | High-resolution archive images; a custom shader |
| 4 | Depth inside photographs | Foreground and background separate slightly as the viewpoint changes; light moves gently over the image surface. | High | Original images, depth maps or carefully separated layers |
| 5 | A browsable spatial archive | People, places, photographs, and dates form an explorable collection. A selected item expands into a readable document. | Very high | A substantial, accurately described archive |
| 6 | Synchronized testimony and sound | The transcript, imagery, dates, and ambience respond to the actual moment in the testimony. | High | Full films, approved transcript, cue timestamps, audio stems |
| 7 | Light particles forming a memory | A field of light gathers into a photograph or chapter title in one carefully placed transition. | Very high | Good source images and custom GPU work |
| 8 | A navigable captured place | The visitor moves a short distance inside a real captured room or location using 3D Gaussian splats. | Very high; capture-dependent | Multi-view photographs/video or an existing splat asset |

Complexity describes a polished implementation, including touch behavior, responsive layouts, interruption handling, and graceful fallbacks. These are not delivery estimates.

## 1. Physical 3D paper — the best first investment

**Signature moment:** the visitor presses or drags the edge of the cover. The sheet bows before lifting, light catches its rough surface, and the shadow reveals the page beneath it.

Use a subdivided plane with controlled vertex deformation, a damped spring for settling, subtle normal/roughness detail, and a small lighting setup. An analytical curl is a good starting point; a full cloth simulation adds considerable tuning and is only justified if unconstrained crumpling becomes part of the design.

The hard part is making the visible surface, normals, and shadow geometry agree as the sheet bends. A flat shadow beneath a curved page immediately weakens the illusion. Touch input also needs an obvious tap-to-open path and a bounded drag region.

Implementation route: Three.js, optionally managed through React Three Fiber, with custom shader deformation. Keep readable headings, controls, and captions in the DOM. The existing cover can be the visual fallback and initial loading view.

Primary references: [Three.js custom attributes example](https://threejs.org/examples/#webgl_custom_attributes), [source](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_custom_attributes.html), and [React Three Fiber Canvas documentation](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/canvas.mdx).

## 2. Continuous camera choreography — the strongest overall transformation

**Signature moment:** a chapter card leaves the stack, rotates into view, and fills the screen. Its photograph and the film’s opening composition line up, allowing the testimony to begin within the same visual movement.

Keep one persistent scene and camera. Define deliberate poses for the cover, chapter index, film entrance, and archive. Coordinate camera position, focus, sheet deformation, lighting, and the DOM layout through one transition controller. Let the visitor reverse or interrupt a transition without leaving the navigation half-complete.

Use GSAP timelines for the main choreography; use ScrollTrigger only where scroll genuinely controls the narrative. GSAP Flip or the browser View Transition API can connect DOM-based layouts. Browser view transitions handle snapshots and view changes; they do not simulate a paper surface or a 3D camera.

Bruno Simon’s portfolio is a useful reference for a coherent interactive world. Its source explicitly organizes the update loop around inputs, physics, view, lighting, audio, rendering, and monitoring. Its compression pipeline is equally instructive: a scene’s polish depends on asset preparation as well as code.

Primary references: [Bruno Simon’s portfolio source](https://github.com/brunosimon/folio-2025), [GSAP](https://github.com/greensock/GSAP), [Flip source](https://github.com/greensock/GSAP/blob/master/src/Flip.js), and [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API).

## 3. Ink and paper reveals — the most suitable shader reference

**Signature moment:** a photograph develops across the archive page. Its boundary branches along imaginary paper fibres, the ink gathers at the edge, and the movement follows the visitor’s scroll.

The locally tested Codrops Ink example combines warped noise, fine edge detail, directional runs, and scroll velocity. It draws the effect only in the empty band between sections. That is a valuable implementation detail: an organic edge should leave the reading area clear.

For this project, use warm paper and dark photographic tones, with restrained movement. Apply one consistent ink treatment at chapter entrances and selected archive boundaries.

**Verified reference:** [Codrops Seam Transitions demo](https://tympanus.net/Demos/SeamTransitions/) and [source](https://github.com/codrops/SeamTransitions). [Local screenshot](ink-reference.png).

Two other locally tested variations are useful comparisons:

- **Typeset:** the photograph breaks into a field of readable-looking letter shapes. It could bridge a photograph and a transcript, provided the transition text does not imply a quotation that was never spoken. [Demo](https://tympanus.net/Demos/SeamTransitions/index4.html), [screenshot](typeset-reference.png).
- **Fray:** the photographed material unravels into individual moving threads. It is technically impressive, but its textile metaphor is less closely connected to this project’s paper archive. [Demo](https://tympanus.net/Demos/SeamTransitions/index3.html), [screenshot](fray-reference.png).

## 4. Depth inside archival photographs

**Signature moment:** a Vienna street photograph behaves like a shallow window. The foreground moves slightly faster than the buildings behind it, and the frame’s lighting changes with the viewpoint.

Use an approved depth map or a small set of separated image layers, with very limited camera travel. Large moves expose areas that the original photograph never recorded; a small travel envelope can preserve the source image without invented background content. Movement can come from camera and light while photographed people remain unchanged.

A depth map alone does not create a full 3D environment. Source preparation and careful edge handling determine whether the result feels refined.

Implementation route: a textured mesh or layered planes inside the same Three.js scene. Render static DOM images whenever motion is reduced or graphics support is insufficient.

Reference building blocks: [Three.js shader attributes](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_custom_attributes.html), [depth-of-field example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_postprocessing_dof.html).

## 5. A spatial archive with meaningful connections

**Signature moment:** visitors move through a collection organized by year, place, and person. Selecting a photograph draws related documents closer and expands the selected item into a reading view.

Use real metadata and explicit relationships. An archive with only the three supplied photographs would benefit more from a precise editorial presentation; a larger collection could justify spatial browsing.

Build a virtualized 2D or shallow-3D collection with a bounded camera, clear controls, and a conventional list or grid alternative. A persistent item identity should carry the same photograph between the collection, detail view, and transcript reference.

References: [Codrops Connected Grid](https://github.com/codrops/ConnectedGrid), [demo](https://tympanus.net/Development/ConnectedGrid/), [Codrops Staggered 3D Grid](https://github.com/codrops/Staggered3DGridAnimations), and [MDN View Transitions](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API). These demonstrate layout and transition ingredients; the archive described here requires additional interaction and data work.

## 6. Testimony, typography, and sound sharing one timeline

**Signature moment:** a place name in the spoken testimony brings a map or photograph into view. The visitor can select the corresponding transcript passage to seek to that moment. Quiet environmental audio changes as the archive opens, while the testimony remains intelligible.

Treat the video’s media timeline as authoritative. Use a cue sheet with word or passage timestamps. `requestVideoFrameCallback()` provides media timestamps for video-linked visual updates; it is not a strict synchronization guarantee. Read `currentTime` for seeking and state reconciliation, and ensure seeking, buffering, and pause all update the surrounding interface correctly.

Web Audio can provide gain control, crossfades, and spatial placement for environmental stems. Activate audio after a visitor action. Keep the spoken testimony clear and provide a straightforward mute control.

For typography, a strong reference is [Codrops Kinetic Typography Page Transition](https://github.com/codrops/KineticTypePageTransition): background letters become foreground elements and reveal another content level. In this project, chapter names and dates could carry transitions while body text stays readable.

Primary technical references: [MDN video frame callbacks](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), [Web Audio guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API), and [PannerNode](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode).

## 7. Light gathering into a photograph

**Signature moment:** a sparse field of light gradually resolves into the original archival image. The points settle into a still photograph as the testimony begins.

Sample the source image into point positions and colors; animate from an abstract arrangement to the image plane. Drive progress through a shader. Use adaptive point density and keep the effect brief. This is a custom implementation proposal, rather than a ready-made effect verified in this project.

WebGPU compute is an ambitious enhancement. WebGL techniques can also maintain particle state on the GPU. Choose one baseline rendering architecture before building the effect: GLSL-specific materials do not transfer unchanged into a WebGPU pipeline.

Primary references: [Three.js GPU computation example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_gpgpu_birds.html), [WebGPU Samples](https://webgpu.github.io/webgpu-samples/), and [React Three Fiber renderer documentation](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/canvas.mdx).

## 8. Gaussian splats — the ambitious capture-based option

**Signature moment:** visitors enter a small, captured archive room or location and move within it before returning to the documentary material.

Spark integrates Gaussian splats with the Three.js rendering pipeline and documents support for multiple splat objects, common compressed formats, sorting, and dynamic transformations. Its advertised mobile capability must be checked against the actual scene and target devices.

The central dependency is capture. The three supplied screen recordings cannot establish a faithful, freely navigable 3D location. We would need multi-view capture, an existing splat, or a separately created and clearly identified reconstruction.

This is a strong option if an appropriate real location can be captured. It adds substantial asset processing, streaming, memory, navigation, and device-testing work.

Primary references: [Spark source and documentation](https://github.com/sparkjsdev/spark), [examples](https://sparkjs.dev/examples/).

## Suggested first sequence

1. **Arrival:** a close view of paper grain and a raised cover edge establishes a physical object.
2. **Interaction:** a press or drag bends the cover and reveals another sheet underneath.
3. **Choice:** six chapter sheets separate in depth. A selected sheet lifts toward the camera.
4. **Transition:** its photograph spreads across the surface through the ink shader.
5. **Testimony:** the photograph’s composition aligns with the film entrance; the original voice begins when the full source film is available.
6. **Exploration:** opening the archive moves the document into a readable layout, preserving its visual identity and the visitor’s playback position.

A prototype should concentrate on this one route from cover to Chapter 01. Once its lighting, timing, and interruption behavior are convincing, extend the visual system across the remaining chapters.

## Technical choices for this repository

- Keep React and Vite. Add Three.js, optionally React Three Fiber, for one persistent rendering surface.
- Use GSAP for coordinated timelines and scene transitions. Native scrolling is a sound baseline. If smoothing is needed, choose one controller: Lenis or ScrollSmoother. Avoid competing animation loops and scroll controllers.
- Lenis documents ScrollTrigger integration and reduced-motion handling; it also documents touch, Safari, and nested-scroll limitations. Test the existing archive dialogs specifically.
- Retain readable DOM content, focus restoration, chapter deep links, browser history, captions, and static images as part of the design.
- Use WebGL2 as the proposed graphics baseline with a complete DOM fallback. Add WebGPU after device capability checks and a renderer prototype. Current MDN compatibility data still describes platform and browser gaps; a browser brand alone is insufficient evidence of support.
- Render when needed, cap pixel ratio, adapt shadow resolution and effect density, and pause offscreen effects. Benchmark target phones before committing to expensive postprocessing.
- These client-side techniques can still be deployed through GitHub Pages. A future full-length media library may need separate media hosting depending on its size and delivery needs.

## Asset preparation that would change the result most

The current project uses screen-captured imagery and a 2.5-second interview excerpt. A convincing shader prototype is possible with those assets; close camera moves and a complete synchronized documentary require better sources.

Prioritize original-resolution photographs, the complete films, accurate transcripts and timestamps, paper scans, and deliberate sound design. Depth maps, layered photographs, and 3D captures are additional assets for the selected effects.

## Source notes

- [Three.js](https://github.com/mrdoob/three.js): rendering, custom attributes, GPU computation, postprocessing.
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/canvas.mdx): renderer setup, demand rendering, pixel ratio, fallbacks, WebGPU initialization.
- [GSAP current README](https://github.com/greensock/GSAP): sequencing, ScrollTrigger, Flip, React cleanup, current plugin availability. Some older demonstration READMEs still mention paid Club plugins; the current maintainer README says the full toolset is free, including commercial use, under its own license.
- [Lenis](https://github.com/darkroomengineering/lenis): scroll integration and its documented limitations.
- [Codrops Seam Transitions](https://github.com/codrops/SeamTransitions): locally tested Ink, Typeset, and Fray examples. The included reference screenshots are captures of these examples, not proposed screenshots of Benno’s Light. The demo credits its photographs as generated imagery; those images are not proposed historical content for this project.
- [Bruno Simon, Folio 2025](https://github.com/brunosimon/folio-2025): integrated scene systems and compressed asset pipeline.
- [Spark](https://github.com/sparkjsdev/spark): Gaussian splat rendering and example assets.
- [MDN browser compatibility data: GPU](https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json) and [ViewTransition](https://github.com/mdn/browser-compat-data/blob/main/api/ViewTransition.json): compatibility evidence reviewed during research.
- [MDN WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API): an advanced option for tightly controlled frame processing. It requires media demuxing, explicit codec handling, and frame-memory management; it is unnecessary for ordinary testimony playback.
