# Benno’s Light

A responsive React experience based on the supplied Benno’s Light recordings. The opening is an interactive exhibition with four explorable rooms, sculptural light installations, and Gaussian-splat photographs. The saved paper cover, six-card chapter index, testimony player, and scrollable archive remain available.

## 3D archive experiment

The default opening uses Three.js and Spark 2.4.0 to render approximately 70,000 Gaussian splats in the photographic exhibits. A monumental circular opening, a sculpted canopy, glass exhibition wings, and a distant sunrise frame a suspended installation of 2,420 mirrors. Bloom is the opening composition; **Shape the light** cycles through Ribbon, Constellation, and Bloom. A larger reflecting pool follows the transformation, with softened reflections and viewing-angle-dependent strength. Light shafts, floating motes, an HDR rendering pipeline, and an opening camera arc complete the scene. This is an **imagined gallery and technical study**, not a captured historical location. It uses the supplied photographs and runs locally without requesting external scene assets. See the [original art direction](docs/research/pavilion-art-direction.md), the [UI/UX and optical implementation study](docs/research/atlas-ui-and-optics.md), and the [room-transition research](docs/research/room-transition-system.md).

- **Live doorways and room transfers:** visible entrances show rendered destination scenes with parallax. Every one of the twelve room-to-room directions uses a GPU aperture and a coordinated camera arrival. Destination treatments include orbital gold, mint silk, spectral refraction, and ivory afterimage light. Door clicks, projected markers, atlas choices, and guided stops share this system. **Skip**, Escape, or manual navigation can finish a transfer immediately; reduced motion uses direct room changes.
- **Explore the rooms** opens a visual atlas for the Lumen Pavilion, Orbit Hall, Sky Garden, and Prism Chamber, with illustrated room cards, a schematic desktop floor plan, and visit indicators. Glowing doorways can also be selected in 3D or through their projected, keyboard-accessible entrance markers. Orbit Hall suspends nine gold light rings above an obsidian reflecting floor. The open-roof Sky Garden holds 1,100 iridescent petals above a shallow basin. Prism Chamber adds seven transmissive crystal forms, dispersion, a spectral backlight, and a floor light field. Each room has its own viewpoints and a route back to the pavilion.
- Drag to orbit, scroll or pinch to move closer, and use fifteen composed viewpoints: six in the pavilion and three in each additional room. Mobile viewpoints scroll horizontally with larger labels.
- **Controls** groups lighting, artwork adjustments, reset, help, local captures, and walking into one disclosure. In Prism Chamber, **Move the light** adjusts the spectrum with a native pointer/keyboard slider.
- **Just the art** hides the exhibition interface. Its exit button or Escape returns to the interface and restores focus.
- **Shape the light**, inside Controls, transforms the installation in 1.5 seconds, or immediately with reduced motion. The camera entrance opens the constellation into Bloom when motion is allowed.
- **Take the journey** follows twelve camera stops across all four rooms, with editorial captions and coordinated artwork/lighting. Next, previous, stop, Escape, room selection, and manual navigation keep the route interruptible. It stops when another dialog opens and does not advance while the tab is hidden.
- Select a photograph in the room or use its **+** marker to open the archive reader. Native modal focus, keyboard access, Escape, and a route into Benno’s testimony are supported. Dragging and pinching do not select an image.
- **Daylight / After hours** changes the sky, skylight, studio environment, and exhibition lighting. Reduced motion makes this change immediate.
- Focus the canvas and hold W/A/S/D or the arrow keys to move. The on-screen direction controls also work with pointer, touch, and keyboard input. Reset returns to the current room's entrance.
- Use the upload action inside Controls to open your own `.spz`, `.splat`, or `.ply` capture, up to 90 MB. Files stay on the device and are normalized into the viewer. The orientation control turns an upside-down capture over.
- **Listen to Benno** opens the testimony through the content notice. The chapter archive works as before.
- **Original view** restores the paper cover for the browser session. **Enter the 3D room** switches back. `?view=classic` explicitly opens the saved cover.
- Reduced motion makes viewpoint transitions immediate. Rendering pauses when the tab is hidden and updates on demand while the room is still. A graphics failure offers the original experience.

The 3D renderer is a separate, lazy-loaded JavaScript chunk, about 1.2 MB gzipped. The initial interface can render while it loads. The planar reflection uses a separate camera with native photograph planes, keeping Spark's main-camera sorting separate from the mirror pass. Static shadows and unchanged mirror views are cached and rendering stops updating at rest. Software graphics use a lighter render tier without bloom/MSAA, reduce resolution during movement, and restore full detail at rest. Browser checks use software WebGL and touch emulation; actual mobile hardware performance still needs evaluation.

### Return point

The complete version before the experiment is saved under the Git tag **`checkpoint-before-3d-location`**, commit `fe873f9`. That checkpoint includes the research document and reference screenshots. The original deployed application is commit `596b4e8`.

The warmer, first 3D archive is also saved under **`checkpoint-before-modern-gallery`**, commit `1843ed6`.

The white contemporary gallery before the sculptural atrium is saved under Git tag **`checkpoint-before-sculptural-atrium`**, commit `f387863`.

The unpublished pastel atrium before the reference-led pavilion redesign is also saved locally in `/workspace/benno-atrium-before-research-redesign.tar.gz`.

The first Lumen Pavilion before the kinetic installation is saved under **`checkpoint-before-kinetic-gallery`**, commit `bb550a2`.

The kinetic gallery before the guided journey and Bloom update is saved under **`checkpoint-before-gallery-journey`**, commit `de37abd`.

The single-room Bloom gallery before the room expansion is saved under **`checkpoint-before-connected-rooms`**, commit `311586d`.

The three-room gallery before the atlas, UI redesign, and Prism Chamber is saved under **`checkpoint-before-atlas-prism`**, commit `b2ab6c3`.

The atlas/Prism version before live doorway views and cinematic transfers is saved under **`checkpoint-before-portal-transitions`**, commit `18916e6`.

Direct links such as `?view=spatial&room=prism` open a specific room; `view=spatial` overrides the saved original-view preference for that URL.

To inspect a checkpoint without changing files, use `git show <tag>:<path>`. **Original view** offers an immediate visual comparison without changing Git history. To restore an earlier version in Git history, revert subsequent updates in reverse order. Pushing changes to `main` triggers the Pages deployment; leave draft changes local until publication is requested.

## Develop

Requires Node.js 20.19+ or 22.12+. This environment uses Node.js 24.

```sh
cd /workspace/t013
npm ci --cache /workspace/.npm-cache
npm run dev
```

The development server uses port 5173. Use the existing checkout; each cloud task is already isolated, so no worktree is necessary. No environment variables, credentials, database, or external API are required.

```sh
npm run build
npm run preview
npm test
```

Browser tests use `/usr/bin/chromium` when present, or a standard Playwright installation otherwise. Set `CHROMIUM_PATH` to use a different executable. On another machine, run `npx playwright install chromium` if no browser is installed. With software graphics, run `npm test -- --workers=1` so simultaneous browsers do not compete for the renderer. Tests cover desktop and mobile navigation, all twelve room transfers, interruption and reduced motion, video playback, modal focus, the archive carousel, deep links, history, and accessibility controls.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys the site whenever `main` is updated. It also supports manual runs from the Actions tab. It uses the Pages-provided base path, so assets, video, captions, and chapter links work at the repository URL.

One-time repository setting:

1. Open **Settings → Pages → Build and deployment**.
2. Set **Source** to **GitHub Actions**. No publishing branch or `/docs` folder is needed.
3. If the initial workflow ran before Pages was enabled, open **Actions → Deploy to GitHub Pages → Run workflow**, select `main`, and run it again.

The expected project URL is https://ejaubashi.github.io/t013/. The Actions deployment reports the final URL and deployment status. No custom domain is required. If GitHub says Pages is unavailable for the repository, its visibility and account plan must support GitHub Pages.

To check the Pages build locally:

```sh
npm run build -- --base=/t013/
npm run preview -- --base=/t013/
```

The preview then serves the site under `/t013/`. The usual `npm run build` still builds for the domain root.

## Experience

- Explore the room, choose **Listen to Benno**, read the content notice, and enter the testimony. **Original view** retains the paper-cover route.
- Use **All chapters** to explore all six chapters. Chapter links also work directly via `#chapter-1` through `#chapter-6`.
- Use **Chapter content** for the chapter heading, reading section, archival photographs, carousel, and next chapter.
- Escape closes a panel and restores focus. The accessibility panel offers reduced motion and larger reading text. System reduced-motion preferences are respected.
- Sound starts muted. The short testimony excerpt supports play, pause, replay, and mute. Opening a panel pauses playback.
- Only chapter numbers are saved in local storage. The privacy panel clears them. No tracking services are used.

## Reference and media limits

The live reference at https://bennos-light.org/ was blocked by this environment’s outbound domain policy. The implementation is based on the supplied recordings, not the original source code.

The images and the 2.5-second interview excerpt in `public/assets/` were cropped from the supplied recordings. The photographs therefore retain the resolution and occasional pointer marks of the screen captures. The full original chapter films, soundtrack, translations, and complete historical archive were not provided. Chapters 2–6 offer chapter introductions and archive navigation, with an explicit notice that the full film is unavailable. Chapter reading text provides historical context and is **not** represented as a verbatim testimony transcript.

The original experience is presented by Claims Conference and credited to makemepulse. This is an independent reconstruction. Fonts are Archivo, Archivo Black, and Cormorant Garamond, bundled locally through Fontsource. The 3D room is an authored spatial study and carries no claim to reconstruct Benno’s actual surroundings.

### Media provenance

| Asset                                                  | Supplied recording                    |
| ------------------------------------------------------ | ------------------------------------- |
| Paper texture, young Benno’s eyes                      | `Registrazione 2026-11-10 114144.mp4` |
| Interview still and short video excerpt                | `Registrazione 2026-11-10 114215.mp4` |
| Childhood portrait, family photograph, Vienna panorama | `Registrazione 2026-11-10 114325.mp4` |

To complete the original long-form experience, replace the captured assets with original media and supply the six complete chapter films, their captions, and approved transcripts. Chapter metadata and contextual text live in `src/chapters.js`; view and interaction logic live in `src/main.jsx`.
