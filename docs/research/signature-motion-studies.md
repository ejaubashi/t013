# Signature transitions for Benno’s Light

Research and prototypes, 15 November 2026.

## Recommendation: Continuum

The gallery view gathers into a continuous ivory Möbius surface, turns as a small sculpture, and opens as the destination room. This connects the transition to the exhibition’s own objects: the pavilion’s satin forms, Orbit Hall’s rings, the garden’s paper and the prism room’s frosted surfaces.

The important design decision is the intermediate object. The passage has a recognizable form and material, rather than relying on an interchangeable reveal mask. The topology, timing, texture mapping and back-face reveal are authored for this project. A claim that nobody has used a related idea before cannot be established from this research.

**Lamina** is the second study. Forty-eight continuous vertical surfaces bend and turn through different depths. It is a more architectural, rhythmical interpretation of the same palette, suited to a gallery of paper and light installations.

Open `?view=motion` to compare them. Each supports playback, pause, manual scrubbing, room pairing and a downloadable SVG storyboard for Figma. The published gallery’s existing room controller and transition remain unchanged; these are separate design studies.

## Sources checked

| Primary source | Finding | Decision for this project |
| --- | --- | --- |
| [Three.js Shading Language specification](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) | A graph written in JavaScript can generate shaders for WebGPU or WebGL 2. Position nodes can deform real geometry. | Use TSL for both working studies. |
| [Three.js WebGPURenderer](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/WebGPURenderer.js) | Tries WebGPU and falls back to WebGL 2. The installed 0.180 renderer already provides this path. | Add a separately loaded study renderer; retain the gallery’s Spark-compatible renderer. |
| [Codrops Cinema Seat Preview](https://github.com/codrops/CinemaSeatPreview) | A current WebGPU/TSL reworking of a 2016 CSS experiment; space, camera and material behavior belong to the experience itself. | Treat the transition as an authored spatial installation. No demo code or assets are copied. |
| [Codrops Interlude](https://github.com/codrops/interlude) | Current transition orchestration, reversible motion, capture layers, lazy loading, TSL shader covers and reduced motion. | Keep one normalized progress value and lifecycle; separate the visual identity from the controller. |
| [Three.js ParametricFunctions](https://github.com/mrdoob/three.js/blob/master/examples/jsm/geometries/ParametricFunctions.js) | Parametric Möbius and Klein surfaces provide a useful mathematical vocabulary for sculpture. | Author a continuous flat-view → ribbon → flat-view deformation using the classical Möbius parameterization. |
| [Three.js WebGPU particle computation](https://github.com/mrdoob/three.js/blob/master/examples/webgpu_compute_particles.html) | Compute/storage can animate large particle systems on the GPU. | A future option for captured point clouds; the proposed surfaces need only vertex shaders and a few draw calls. |
| [Three.js TSL/WGSL interoperability](https://github.com/mrdoob/three.js/blob/master/examples/webgpu_tsl_interoperability.html) | Raw WGSL and TSL can be combined, but raw WGSL ties that part of the implementation to WebGPU. | TSL keeps this prototype available on both rendering backends. |
| [GSAP](https://github.com/greensock/GSAP) | Current sequencing, FLIP, SVG morphing and layout animation tools. Registry latest checked: **3.15.1**. | Useful for complex future choreography; not required for a single GPU progress timeline. |
| [Motion](https://github.com/motiondivision/motion) | Modern JavaScript/React animation primitives for interfaces. | Relevant to surrounding UI, rather than a substitute for scene geometry. |
| [Figma plugin examples](https://github.com/figma/plugin-samples) | Figma supports programmatic vector creation and SVG-based design workflows. | Provide an SVG with embedded study frames and editable vector labels. A Figma app is not connected in this environment. |

The npm registry reported Three.js **0.187.0** as latest when checked. The project intentionally keeps its installed **0.180** dependency: its TSL surface and backend APIs are sufficient for this study, and a full dependency migration would be a different task. Package age is not a measure of visual originality.

Frequently circulated references were also checked: [KineticTypePageTransition](https://github.com/codrops/KineticTypePageTransition) links to September **2021**, [SlideshowAnimations](https://github.com/codrops/SlideshowAnimations) to September **2023**, and [OneElementScroll](https://github.com/codrops/OneElementScroll) to November **2024**. They are useful references for composition and continuity; they are not presented here as new 2026 techniques. The [GL transitions collection](https://github.com/gl-transitions/gl-transitions) was checked as a vocabulary of conventional image effects.

Research uses current upstream documentation and source, including the installed renderer implementation. External showcase experiences have not been claimed as live-tested.

## Languages and responsibilities

- **TSL:** author the deformation, texture mapping, back-face reveal and material response once. This is the language used by the prototypes.
- **WGSL / WebGPU:** the native modern GPU target where available.
- **GLSL / WebGL 2:** the automatically compiled compatibility target.
- **React / JavaScript:** controls, playback lifecycle, room choices and exports.
- **Figma:** storyboard, timing, layout and design collaboration. It is not the engine for the 3D deformation.

## Prototype boundaries

The input views are screenshots of the existing authored gallery, captured without its interface. The prototypes deform those views on actual GPU meshes. They do not relocate the room’s physical walls or move the visitor through a connected building. If adopted, the same material timeline can use the live HDR room captures and depth already held by the gallery compositor; navigation, interruption and exact camera arrival remain in the existing controller.

Both studies have exact flat source and arrival poses. The destination image is visible through the negative space while the material moves. The source image turns with the surface; the arrival image is mapped to the back with its horizontal direction corrected. The material becomes quiet ivory at the sculptural midpoint and returns to the original image colors at the endpoint.

The first study uses one 128 × 64 segmented surface. The second uses 48 strips with 2 × 48 subdivisions. Normals for the shaded material are derived from the deformed view-space surface. There are no simulated particles, hidden external assets or new package dependencies.

Reduced motion opens a still study with manual inspection. An explicit Play command goes directly to the endpoint. Hidden tabs pause playback. The SVG storyboard includes five frames, progress values, duration, concept text and editable labels. Its embedded images are raster previews of the live 3D study.

## Validation

The Pages-base production build passed. Four new desktop/mobile browser checks passed, covering both surfaces, rendered source/arrival equivalence, room pairing, five distinct exported frames, real image readbacks, playback/pause, keyboard scrubbing, reduced motion, overflow and return to the existing gallery. Production previews and SVG rendering were inspected at desktop and phone sizes without page errors or failed asset requests. This environment used the WebGL 2 fallback; a physical WebGPU device was not available for measurement.
