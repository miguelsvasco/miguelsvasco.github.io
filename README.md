# miguelsvasco.github.io

Personal website of Miguel Vasco — a minimal single-page static site.

Live at: https://miguelsvasco.github.io

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Entry point — all styles inlined, loads the JS/JSX below |
| `data.js` | All site content: bio, publications, news, social links |
| `site-quiet.jsx` | Main page layout (React, compiled in-browser via Babel) |
| `image-slot.js` | Web component for the profile photo |
| `tweaks-panel.jsx` | Floating density/color tweaks panel |
| `konami.jsx` + `bullet-hell.jsx` | Easter egg |
| `assets/img/prof_pic_2026.png` | Profile photo |
| `files/CV.pdf` | CV download |

## Local preview

Open `index.html` directly in a browser, or serve with any static file server:

```bash
npx serve .
# or
python3 -m http.server
```

## Updating content

All content — bio, publications, news, contact note, social links — lives in `data.js`.
Edit that file and reload; no build step required.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which deploys the static
files to the `gh-pages` branch via `JamesIves/github-pages-deploy-action`.
GitHub Pages is configured to serve from `gh-pages`.
