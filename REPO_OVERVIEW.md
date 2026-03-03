# Repository Overview

## What this repository is
This repository currently hosts a **single-page personal portfolio website** for Anubhav Soam, built as a static site.

## Current file layout
- `index.html` — Main page markup and section content (hero, experience, skills, projects, education, contact, footer).
- `styles.css` — Centralized styling, theming tokens, component styles, and responsive behavior.
- `WEBSITE_SCHEMA.md` — Intended architectural schema and future-change constraints.
- `README.md` — Minimal project title placeholder.

## Observations
1. The implementation is currently **HTML + CSS only** in this repository state.
2. `WEBSITE_SCHEMA.md` references a `script.js`-driven tabbed and DCF flow, but `script.js` is not present in the tracked files.
3. The page appears to be structured as a linear single-page portfolio (not tabbed) in the present `index.html`.
4. The CSS uses design tokens in `:root` and `[data-theme="light"]` and styles detailed sections/components for a polished visual layout.

## How to run locally
Because it is static, you can open `index.html` directly in a browser, or serve it with a simple local HTTP server, for example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Suggested next improvements
- Expand `README.md` with setup instructions, deployment notes, and section map.
- Either add the missing `script.js` implementation or update `WEBSITE_SCHEMA.md` to match the current HTML/CSS-only state.
- Introduce lightweight validation (HTML/CSS linting) to reduce regressions.
