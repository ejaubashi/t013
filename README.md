# Benno’s Light

A responsive React reconstruction of the Benno’s Light experience shown in the three supplied recordings. It recreates the layered paper cover, oversized typography, moving chapter headings, six-card chapter index, testimony player, and scrollable archive.

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

- Open the cover, read the content notice, and enter the testimony.
- Use **All chapters** to explore all six chapters. Chapter links also work directly via `#chapter-1` through `#chapter-6`.
- Use **Chapter content** for the chapter heading, reading section, archival photographs, carousel, and next chapter.
- Escape closes a panel and restores focus. The accessibility panel offers reduced motion and larger reading text. System reduced-motion preferences are respected.
- Sound starts muted. The short testimony excerpt supports play, pause, replay, and mute. Opening a panel pauses playback.
- Only chapter numbers are saved in local storage. The privacy panel clears them. No tracking services are used.

## Reference and media limits

The live reference at https://bennos-light.org/ was blocked by this environment’s outbound domain policy. The implementation is based on the supplied recordings, not the original source code.

The images and the 2.5-second interview excerpt in `public/assets/` were cropped from the supplied recordings. The photographs therefore retain the resolution and occasional pointer marks of the screen captures. The full original chapter films, soundtrack, translations, and complete historical archive were not provided. Chapters 2–6 offer chapter introductions and archive navigation, with an explicit notice that the full film is unavailable. Chapter reading text provides historical context and is **not** represented as a verbatim testimony transcript.

The original experience is presented by Claims Conference and credited to makemepulse. This is an independent reconstruction. Fonts are Archivo and Archivo Black, bundled locally through Fontsource.

### Media provenance

| Asset                                                  | Supplied recording                    |
| ------------------------------------------------------ | ------------------------------------- |
| Paper texture, young Benno’s eyes                      | `Registrazione 2026-11-10 114144.mp4` |
| Interview still and short video excerpt                | `Registrazione 2026-11-10 114215.mp4` |
| Childhood portrait, family photograph, Vienna panorama | `Registrazione 2026-11-10 114325.mp4` |

To complete the original long-form experience, replace the captured assets with original media and supply the six complete chapter films, their captions, and approved transcripts. Chapter metadata and contextual text live in `src/chapters.js`; view and interaction logic live in `src/main.jsx`.
