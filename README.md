# Benno’s Light

A responsive React experience based on the supplied Benno’s Light recordings. The opening is now a navigable archive rendered with Gaussian splats. The saved paper cover, six-card chapter index, testimony player, and scrollable archive remain available.

## 3D archive experiment

The default opening uses Three.js and Spark 2.4.0 to render approximately 65,000 Gaussian splats. The room, photographs, display frames, paper, and furniture are authored Gaussian surfaces. This is an **imagined archive and technical study**, not a captured historical location. It uses the supplied photographs and runs locally without requesting external scene assets.

- Drag to orbit, scroll or pinch to move closer, and use the four composed viewpoint buttons.
- Focus the canvas and hold W/A/S/D or the arrow keys to move. The on-screen direction controls also work with pointer, touch, and keyboard input. Reset returns to the entrance.
- Use the upload control to open your own `.spz`, `.splat`, or `.ply` capture, up to 90 MB. Files stay on the device and are normalized into the viewer. The orientation control turns an upside-down capture over.
- **Listen to Benno** opens the testimony through the content notice. The chapter archive works as before.
- **Original view** restores the paper cover for the browser session. **Enter the 3D room** switches back. `?view=classic` explicitly opens the saved cover.
- Reduced motion makes viewpoint transitions immediate. Rendering pauses when the tab is hidden and updates on demand while the room is still. A graphics failure offers the original experience.

The 3D renderer is a separate, lazy-loaded JavaScript chunk, about 1.1 MB gzipped. The initial interface can render while it loads. Browser checks use software WebGL and touch emulation; actual mobile hardware performance still needs evaluation.

### Return point

The complete version before the experiment is saved under the Git tag **`checkpoint-before-3d-location`**, commit `fe873f9`. That checkpoint includes the research document and reference screenshots. The original deployed application is commit `596b4e8`.

To inspect the checkpoint without changing files, use `git show checkpoint-before-3d-location:<path>`. To undo the experiment after it is committed, revert the commit titled **Add navigable Gaussian-splat archive experience** and push the resulting revert commit; the existing Pages workflow will deploy the restored version. This preserves subsequent history.

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

Browser tests use `/usr/bin/chromium` when present, or a standard Playwright installation otherwise. Set `CHROMIUM_PATH` to use a different executable. On another machine, run `npx playwright install chromium` if no browser is installed. Tests cover desktop and mobile navigation, video playback, modal focus, the archive carousel, deep links, history, and accessibility controls.

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
