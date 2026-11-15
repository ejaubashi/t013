# Nocturne — an exhibition after dark

The visitor enters an already visible room at human eye level. Black stone, charcoal walls, restrained crimson lines, and individual painting lights replace the ivory gallery. This is an authored contemporary gallery, not a captured museum or historical location.

The direction follows the new request for a dark, minimal, colorful experience inside the rooms. The central installations retain distinct identities: a red kinetic ribbon in Nocturne Hall, red orbital lines in Scarlet Room, moonlit paper forms in Night Garden, and smoked crystal forms in Obsidian Room. Material colors and lights create the mood; the paintings are not covered with a dark/red image filter.

## Research and collection

The selection combines chiaroscuro and deep red clothing with twentieth-century fields of red, blue, green, and black. Original aspect ratios and image colors are preserved. The archive provides public-domain reproductions from the State Hermitage Museum, distributed by a community project under CC0; this is not the museum's official API.

| Room | Work | Artist | Date |
| --- | --- | --- | --- |
| Nocturne | Portrait of an Old Man in Red | Rembrandt van Rijn | c. 1652–1654 |
| Nocturne | The Lute Player | Caravaggio | c. 1595–1596 |
| Scarlet | Dance | Henri Matisse | 1910 |
| Scarlet | View of Murnau | Wassily Kandinsky | 1908 |
| Night Garden | Woman in Black | Pierre-Auguste Renoir | c. 1876 |
| Night Garden | Arab Coffeehouse | Henri Matisse | 1913 |
| Obsidian | The Return of the Prodigal Son | Rembrandt van Rijn | c. 1668–1669 |
| Obsidian | Composition | Fernand Léger | 20th century; precise date not supplied by this source |

- [Pinned image archive and CC0 license](https://github.com/pmilovanov/hermitage-art/tree/b8ead49c010eac0c8366bafc4ffaaf1f1a447805).
- Individual original file URLs, source SHA-256 hashes, original dimensions, and generated dimensions are in [`nocturne-sources.json`](../public/assets/artworks/nocturne-sources.json). Wall textures are at most 1024 px; detail views are at most 2200 px. Both use locally hosted WebP.
- Existing earlier collection files remain available to the saved checkpoint; the current gallery loads the new eight works.
- [Three.js SpotLight](https://threejs.org/docs/#api/en/lights/SpotLight): individual cone lights and neutral light color keep the artwork readable in dark architecture. Paintings use lit standard materials rather than full-bright surfaces. Labels sit beside the frames at a readable 1.25 m height.

## First-person movement

All exported authored viewpoints, artwork inspection views, arrival poses, walking, and guided stops use a camera height of **1.72 m**. The room UI offers Walk and Tour; it does not offer an aerial or orbit view for authored rooms. Imported personal splats retain their separate inspection controls.

The entry starts from an actual position inside the threshold. Selecting either entry button starts a gentle inward approach; reduced motion places the visitor immediately. Camera motion toward a painting uses the existing obstacle-aware floor route. A centripetal curve is used when all sampled curve points are walkable, with the planned polyline as the fallback. Manual input interrupts the route. Cross-room transfers retain the projective depth doorway renderer, including skip, interruption, and reduced-motion behavior.

## Optional spatial sound

An original Web Audio graph provides three slowly modulated tones, filtered air, a generated room impulse, restrained footsteps, and a short passage sound. Each room changes the tuning gently. A native HRTF panner and the listener's camera pose supply spatial direction. There are no recordings, music files, or external audio services.

- [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices): create/resume audio only following an explicit visitor gesture. A fresh visit is silent until **Enter with sound**; **Enter quietly** keeps it silent. The global sound button remains available during the visit. The chosen entry state is remembered only within the browser session; sound is never enabled automatically on reload.
- [MDN PannerNode](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode) and [spatialization basics](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics): source position, listener direction, and smooth parameter changes. Listener updates are limited to approximately 11 per second rather than a React update every frame.
- A master gain ramp and compressor control level. Hidden tabs suspend audio; leaving the gallery releases the audio context. Browser failure leaves the visit usable quietly.

## Verification and return point

The browser checks cover explicit sound consent, real audio context start/mute/resume, an offline rendered finite and unclipped audio signal with a silent fade, collection reading and zoom, physical selection of all eight paintings, first-person controls, and all twelve directed room transfers. Reduced-motion behavior and phone layouts are checked separately.

The version before this change is tag **`checkpoint-before-nocturne`**, commit **`1a342e7`**. The separate motion-study prototypes at `?view=motion` document the preceding ivory direction; Nocturne is the main gallery at `?view=spatial`.
