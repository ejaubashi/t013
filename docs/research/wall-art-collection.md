# Paintings on the gallery walls

Implemented 13 November 2026.

Eight digital reproductions of actual paintings now hang in the imagined gallery. This is a separate art selection; these paintings are not presented as part of Benno Kern's historical archive or biography. The original photographs and testimony retain their existing readers and navigation.

## Collection

| Room | Artist | Work | Date |
| --- | --- | --- | --- |
| Lumen Pavilion | Claude Monet | Waterloo Bridge, Effect of Fog | 1903 |
| Lumen Pavilion | Caspar David Friedrich | On a Sailing Ship | c. 1818–1819 |
| Orbit Hall | Wassily Kandinsky | Composition VI | 1913 |
| Orbit Hall | Wassily Kandinsky | Winter Landscape | 1909 |
| Sky Garden | Claude Monet | Corner of the Garden at Montgeron | 1876 |
| Sky Garden | Vincent van Gogh | Lilac Bush | 1889 |
| Prism Chamber | Henri Matisse | The Red Room (Harmony in Red) | 1908 |
| Prism Chamber | Paul Cézanne | Still Life with a Curtain | c. 1895 |

All eight works are oil on canvas; their original collection is the State Hermitage Museum. Display sizes are adapted to the virtual room while preserving each image's original proportions. The digital labels identify the artist, title, date, medium, original collection, and reproduction status. The short looking prompts were written for this experience.

## Image provenance

The image source is the public-domain [hermitage-art archive](https://github.com/pmilovanov/hermitage-art/tree/b8ead49c010eac0c8366bafc4ffaaf1f1a447805), pinned to commit `b8ead49c010eac0c8366bafc4ffaaf1f1a447805`. Its README identifies the high-resolution paintings as public domain, and its repository provides a CC0-1.0 dedication. This is a community image archive, not a live museum API integration or museum partnership.

Each reader links to its original image at that fixed revision and to the full [CC0 text](../../public/assets/artworks/CC0-1.0.txt). The local [source manifest](../../public/assets/artworks/sources.json) records original filenames, pinned download URLs, original dimensions, byte sizes, SHA-256 hashes, and derivative dimensions and sizes.

The originals were resized and compressed to WebP without cropping, generative alterations, or changes to their compositions. Wall textures have a maximum edge of 1,024 pixels; detail images have a maximum edge of 2,200 pixels. Together the eight wall textures total 1,418,354 bytes. All sixteen derivatives total 10,412,944 bytes; large detail images load when selected. The much larger original JPEGs are not shipped. Every runtime image is served from this site's own assets, including under the GitHub Pages repository base path.

## Gallery interaction

Each room has two framed paintings, a wall label below each image, and a small exhibition light. Image textures use sRGB; the image plane stays readable while the frame and backing participate in the room lighting. Two additional non-shadow spotlights are active in the displayed room. Existing scene disposal handles the new geometries, materials, textures, and lights.

The physical canvases participate in the existing ray-selection system. Their projected HTML buttons offer an equivalent labelled keyboard action. **Art collection** opens a native modal catalogue with room filters and a detail reader. Details provide previous/next controls, Left/Right navigation, source credits, and an optional 2× enlargement. Mouse dragging pans the enlarged image; native scrolling supports touch and keyboard use. Fit mode shows the full composition.

**View on the wall** closes the reader before moving the camera to a composed position in front of the work. Cross-room selections share the accepted fluid room-transfer system, including Skip and reduced motion. Every room also gains an **On the walls** overview in the existing keyboard viewpoint dock. The native reader retains modal focus and Escape/close behavior, then restores focus to its opener.

## Checkpoint and validation

The previous interface is saved under `checkpoint-before-wall-art`, commit `94afa71`.

Production-base visual checks covered the Pavilion wall, the collection grid, Kandinsky's wall view, detail and zoom views, and the phone collection/detail/wall layouts. The first production interaction pass confirmed real canvas ray selection, catalogue-to-wall navigation across rooms, and no horizontal phone overflow, page errors, console errors, or failed asset responses.

Twenty relevant desktop/mobile checks passed across serial Playwright runs: six artwork checks, four interface checks, six room-transition checks, and four existing photograph-reader/installation checks. A further phone run verified actual touchscreen taps on every painting. The GitHub Pages production-base build also passed.

Coverage in [artworks.spec.js](../../tests/artworks.spec.js) includes all eight physical painting selections, four-room camera arrivals, image loading, collection filters, labels, keyboard navigation, mouse/touch zoom panning, reader exit ordering, reduced motion, Skip, and focus restoration. Existing interface and room-transition suites cover the shared navigation behavior, all twelve directed room routes, physical doors, and the guided journey. Original photo reading, testimony entry, installation transformation, and after-hours lighting also passed on both screen sizes.

The outside-dismissal regression test now clicks an empty ceiling area: its former left-wall coordinate selects a new painting. The phone coordinate also stays clear of the expanded Controls panel. The focus and keyboard-movement assertions remain in place. Browser graphics use software WebGL and phone touch emulation; physical device performance has not been measured.
