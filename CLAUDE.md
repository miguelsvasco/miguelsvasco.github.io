# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Miguel Vasco's personal academic website — a minimal, dependency-free single-page static site. No build step, no framework, no SSG. React and Babel run in the browser via CDN script tags.

## Local preview

```bash
npx serve .          # or: python3 -m http.server
# open http://localhost:3000 (or :8000)
```

Opening `index.html` directly as a `file://` URL works for visual inspection but breaks the profile photo (blocked by CORS on `<image-slot src=>`); use a local server to see it correctly.

## Deployment

Pushing to `master` runs `.github/workflows/deploy.yml`, which uses `JamesIves/github-pages-deploy-action` to push the static files to the `gh-pages` branch. GitHub Pages serves from `gh-pages`.

## Architecture

Everything the browser needs is at the repo root:

| File | Role |
|------|------|
| `index.html` | Shell: inlined responsive CSS, CDN script tags for React 18 + Babel 7, component load order |
| `data.js` | **Single source of truth** — sets `window.MV_DATA` with bio, publications, news, social links |
| `site-quiet.jsx` | Main page component (`SiteQuiet`): header, hero, about, news, publications, contact, footer |
| `image-slot.js` | Custom element `<image-slot>` — loads profile photo from `src=` attribute or a dragged drop |
| `tweaks-panel.jsx` | Floating panel for density/accent-color tweaks (persisted to `localStorage` via `useTweaks`) |
| `konami.jsx` | Konami-code listener + gate |
| `bullet-hell.jsx` | Easter-egg mini-game triggered by Konami code |

Static assets:
- `assets/img/prof_pic_2026.png` — profile photo (referenced by `site-quiet.jsx` via `<image-slot src=>`)
- `files/CV.pdf` — CV download (linked from the nav bar as `files/CV.pdf`)

## Updating content

**All content lives in `data.js`** — bio, publications, news, contact note, social links. Edit that file; no build or restart needed.

Key fields in `window.MV_DATA`:
- `bioShort` — italic lede under the name in the hero
- `bioLong` — array of plain-text paragraph strings for the About section (first char of `[0]` gets a drop cap)
- `publications` — array of `{ year, title, venue, authors, href, award? }` objects (displayed in order, award shown as ★ badge)
- `news[].body` — HTML string (links and `<strong>` tags are rendered; styled via `.site-news-item a` in `index.html`)
- `contactNote` — italic note at the bottom of the Contact section

## Component load order (matters)

`index.html` loads scripts in this order — each depends on the one before:
1. React + ReactDOM (UMD, CDN)
2. Babel standalone (in-browser JSX transform)
3. `data.js` (sets `window.MV_DATA`)
4. `image-slot.js` (registers `<image-slot>` custom element)
5. `tweaks-panel.jsx` → `konami.jsx` → `bullet-hell.jsx` → `site-quiet.jsx`
6. Inline `<script type="text/babel">` in `index.html` that wires `App` and mounts to `#root`
