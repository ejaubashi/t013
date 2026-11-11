# Lumen Pavilion: reference study and implementation

Research and implementation: 11 November 2026.

## Reference models

These references were selected for specific strengths, rather than treated as a universal ranking. Public source files were retrieved and read; Bruno Simon's official preview image was also visually inspected. Standalone museum websites were not accessible with the environment's current network configuration, so this study does not claim a live-site comparison of them.

| Reference | What was inspected | Principle applied here |
| --- | --- | --- |
| [Bruno Simon — Folio 2025](https://github.com/brunosimon/folio-2025) | Maintainer README, scene-system order, asset-preparation notes, official preview image | Give the environment one coherent material and lighting language; choreograph the entrance and keep navigation inside the same world. The vehicle/game aesthetic was not adopted. |
| [Codrops — Atelier North](https://github.com/codrops/atelier-north) | README, `src/pages/index.astro`, `src/styles/top.scss` | Strong type scale, a small editorial label system, a clear exhibition index, and generous separation between primary and secondary actions. This is a recent architecture-site example, not an asset pack. |
| [drei — Lightformer](https://github.com/pmndrs/drei/blob/master/src/core/Lightformer.tsx) | Source implementation of luminous planes and intensity | Build an authored studio environment from warm and cool light cards; generate a local PMREM map so bronze reflects deliberate shapes. |
| [drei — MeshReflectorMaterial](https://github.com/pmndrs/drei/blob/master/src/materials/MeshReflectorMaterial.tsx) and [reflection controller](https://github.com/pmndrs/drei/blob/master/src/core/MeshReflectorMaterial.tsx) | Reflection camera, roughness/blur mixing, depth parameters | Give water a dark body, soften the reflected image, and vary reflected strength with viewing angle. The implementation uses Three's Reflector with an original nine-tap, Fresnel-weighted shader rather than importing React Three Fiber. |
| [Three.js — selective Unreal Bloom example](https://github.com/mrdoob/three.js/blob/r180/examples/webgl_postprocessing_unreal_bloom_selective.html) | HDR composition and bloom pipeline | Use a high luminance threshold and restrained bloom so luminous filaments glow while photographs remain readable. The scene uses an HDR threshold rather than a second scene-selection render. |
| [Three.js — FXAA example](https://github.com/mrdoob/three.js/blob/r180/examples/webgl_postprocessing_fxaa.html) | Postprocessing antialiasing arrangement | Combine a multisampled HDR target with a final FXAA pass, and set resolution from actual render dimensions after resize. |
| [Three.js — GTAO example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_postprocessing_gtao.html) | Ambient-occlusion pass, sample counts, denoising settings | Assessed as a quality option. It is not included in this draft: the existing reflection and bloom already add offscreen passes, so contact and directional lighting are handled in the scene. |

The [Khronos Sponza model](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Sponza) was also assessed as an architectural lighting benchmark. Its Renaissance courtyard form does not suit this modern gallery. No Sponza assets are included.

## Direction

The earlier pastel atrium relied on repeated ribs and a single smooth sculpture. Its materials and spatial composition were too simple to support the intended quality. The new direction is a stone pavilion with bronze detail, deep recesses, a long skylight, and one circular opening. The main installation is framed by architecture rather than competing with a ceiling of repeated arches.

The installation is an original parametric model: 2,420 mirrored pieces transform between a rising ribbon and a Fibonacci-distributed constellation. Shared GPU attributes interpolate both positions and rotations; normals rotate with each mirror so the reflected lighting remains coherent. Two instanced meshes render the mirror bodies and luminous edges. The sculpture, textured stone, glass exhibition wings, canopy, bench, light cards, and water shader are authored for this project. No third-party building model, reference-site artwork, or AI-generated historical image is used.

## Implemented details

- Locally generated stone color/bump detail, physically based mirrors, and transparent glass exhibition wings.
- A luminous elliptical canopy, 420 light motes, and an authored transparent light-shaft volume. The shaft is a local mesh effect rather than full-scene ray marching.
- GPU interpolation between two mirror formations, a 1.35-second user-controlled transformation, and an initial unfolding during the camera entrance. Reduced motion makes changes immediate.
- Warm exhibit spotlights, a cool area fill, directional skylight shadows, and a locally generated reflection environment.
- A planar reflecting pool with nine-tap softening and viewing-angle-dependent reflection strength.
- An HDR rendering pipeline with restrained bloom, multisampling, and FXAA. Software renderers automatically use a lighter tier: a one-to-one pixel ratio, a 512px mirror, a simpler directional fill, FXAA, and no bloom/MSAA. Geometry, photographs, lighting controls, and navigation are retained.
- Daylight and after-hours lighting, including sky, skylight, environment, and exhibit changes. The change takes 750 ms or is immediate with reduced motion.
- A camera arc and six composed viewpoints, including an elevated canopy view; drag, zoom, keyboard movement, touch controls, and local splat uploads remain available.
- A quieter exhibition index, revised heading, and responsive spacing.
- A render invalidation fix: a Spark update requested during a frame is preserved, so photographs can complete their first sort without requiring a click. Browser checks now inspect the drawn splat count as well as the loaded asset count.

Unchanged mirror views are cached until the camera, projection, lighting, photographic assets, or mirror pose change. Static shadow maps are also reused.

The three photographs remain genuine Gaussian-splat exhibits, approximately 70,000 splats. Native photo planes are visible only to the reflection camera, avoiding a second Spark camera-sort pass. The architecture is an imagined exhibition environment, not a scan of Benno's historical surroundings.

## Review and return point

The first Lumen Pavilion is saved at Git tag `checkpoint-before-kinetic-gallery` (`bb550a2`). The previous unpublished atrium is saved in `/workspace/benno-atrium-before-research-redesign.tar.gz`. The prior white gallery remains at Git tag `checkpoint-before-sculptural-atrium` (`f387863`). The original cover is available immediately through **Original view**.

The user authorized publication after reviewing the draft. Deployment uses the repository's existing GitHub Pages workflow, with the site at https://ejaubashi.github.io/t013/.

## Validation

The production build passes with the GitHub Pages base path `/t013/`. All 24 desktop/mobile browser checks pass with `npm test -- --workers=1` and cover kinetic transformations, the canopy view, actual splat drawing, composed viewpoints, lighting controls, keyboard movement, local capture imports, original-view fallback, chapter navigation, and testimony playback. The browser checks use software Chromium and touch emulation; physical mobile GPU performance remains unmeasured. Earlier detail-tier renders were also visually inspected before the automatic software tier was introduced.
