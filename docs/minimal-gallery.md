# A quieter art gallery

Art direction: 13 November 2026.

The gallery now uses a restrained museum palette across all four rooms and the interface. Colour belongs primarily to the paintings. The architecture supplies soft daylight, pale stone, unbroken plaster walls, and enough empty space around the works.

| Material or surface | Base colour |
| --- | --- |
| Interface paper | `#F7F5F0` |
| Plaster | `#F1EEE7` |
| Limestone | `#D9D3C7` |
| Porcelain | `#F5F2EB` |
| Satin trim | `#A6A094` |
| Charcoal frames and text | `#393A35` |

The architectural constants live in `src/spatial/galleryPalette.js`; the interface palette and surface treatment live in `src/spatial/minimal.css`. These are base material colours, rather than claims about exact rendered pixels under every light.

## Rooms and artworks

- **Pavilion:** unbroken plaster replaces the bronze fins. A clear skylight and thin ceiling baffles replace the elaborate luminous canopy and light shafts. The smaller kinetic sculpture uses muted satin finishes and a simpler Bloom form. A low limestone island replaces the reflecting pool.
- **Orbit Hall:** pale walls, a matte floor, satin rings, and a stone sculpture base replace the dark gold-and-obsidian treatment. Floating light particles are removed.
- **Sky Garden:** ivory paper petals and a pale stone island replace iridescence, coloured water, and decorative ripples. The open roof admits a soft neutral sky.
- **Prism Chamber:** frosted glass and warm/cool whites replace the rainbow disc, coloured floor caustics, and light rays. The existing light slider now changes the temperature of the white illumination.

All eight paintings remain on the walls. Large backing boards are removed, frames use quiet charcoal, and the works sit closer to the plaster wall surface. The original image files and their source credits are unchanged; no desaturation or colour filter is applied to the artworks.

## Interface and movement

The atlas, catalogue, artwork reader, archive reader, walking controls, adjustment panel, and projected markers share warm paper surfaces, charcoal type, fine borders, and restrained shadows. Selected controls use charcoal with light text. Guidance, focus handling, touch controls, and modal motion keep their existing behavior. The dark edge vignette is removed.

First-person walking, the moving arrival, composed viewpoints, nineteen camera views, all four rooms, physical doorway routes, and fluid transfers remain available. The stone islands preserve the footprints already excluded from the walking surface. Matte floors remove the extra planar-reflection render passes; the existing static-geometry batching and motion render budget remain in use.

## Return point and verification

The previous published version is saved at `checkpoint-before-minimal-mood`, commit `6e6fe36`.

The production-base build passed. Fourteen existing desktop/mobile browser checks passed for all eight physical painting selections, keyboard viewpoint navigation, modal exits, phone-sheet dismissal, portrait/landscape layouts, complete walks through doorways, sculpture transformations, the light slider, and focus restoration after art view.

Production visual and interaction checks covered daylight and evening lighting in every room, the atlas, catalogue, artwork details, phone layouts, and physical painting selection. A final pass checked the smaller labels, Controls, evening lighting, and short landscape layouts on desktop and phone. No page or console errors, failed asset responses, or horizontal overflow were recorded. Browser checks use software WebGL and touch emulation; physical device performance has not been measured.

The final review also corrected a native-details visibility issue: the Controls icon and label now explicitly follow the ready/focus states, rather than retaining inherited loading visibility until the panel is first opened.
