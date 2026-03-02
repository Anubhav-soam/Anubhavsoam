# Website Schema (Preserve for Future Changes)

This repository is a static single-page site with tabbed sections. Future changes should **preserve this schema** unless explicitly requested.

## 1) File structure
- `index.html` → page structure and semantic sections.
- `styles.css` → global theme tokens + all component styles.
- `script.js` → UI behavior, tab navigation, theme state, DCF logic/rendering.
- `README.md` → project descriptor.

## 2) Top-level HTML schema (`index.html`)
1. `<nav>` with:
   - logo (`.nav-logo`)
   - tab links (`.nav-links a`) using `showTab(...)`
   - theme toggle button (`#theme-toggle`)
2. Two `.tab-content` containers:
   - `#portfolio` (default active)
   - `#dcf-tab`
3. Portfolio tab section order:
   - Hero (`#home`)
   - Experience (`#experience`)
   - Skills (`#skills`)
   - Projects (`#projects`)
   - Education (`#education`)
   - Contact (`#contact`)
   - Footer
4. DCF tab structure (`#dcf-tab .dcf-terminal`):
   - ticker bar (`#dcfTicker`, `#fetchDataBtn`, `#fetchStatus`)
   - header card (`#coName`, `#coSub`, `#kpiGrid`)
   - internal tabs (`#dcfInnerTabs`)
   - dynamic content mount (`#dcfContent`)

## 3) JavaScript schema (`script.js`)
- Theme management:
  - `applyTheme(theme)`
  - localStorage key: `theme`
- Main page tab switching:
  - `showTab(tab)` toggles `.tab-content` and nav active link classes.
- DCF engine + rendering pipeline:
  - `DEFAULTS` input model
  - mutable state: `inp`, `ticker`, `tab`
  - compute: `calcDCF(data)`
  - mock profile loader: `demoDataForTicker(t)`
  - view renderers: `renderKpis`, `renderTabs`, `inputsView`, `projectionsView`, `valuationView`, `sensitivityView`
  - orchestrator: `renderDCF()`
  - fetch button action: `fetchData()`

## 4) CSS schema (`styles.css`)
- Global theme tokens defined in `:root` and `[data-theme="light"]`.
- Common layout/component classes (nav, sections, cards, hero, contact, etc.).
- Dedicated DCF namespace under `.dcf-terminal ...` for valuation tool styles.
- Responsive behavior via media queries (e.g. DCF grid collapse at narrow widths).

## 5) Compatibility rules for future edits
- Keep existing IDs/classes used by JavaScript stable (`#theme-toggle`, `#portfolio`, `#dcf-tab`, `#dcfContent`, etc.).
- Keep `.tab-content` + `showTab(...)` contract unchanged unless migration is requested.
- Keep DCF state keys consistent with `DEFAULTS` and renderer expectations.
- If adding new UI blocks, use additive changes (new classes/IDs) without renaming current hooks.
- Preserve light/dark token strategy and avoid hardcoding colors where tokens exist.

## 6) Safe extension pattern
- Add new section in `index.html` → style it in `styles.css` → wire interactions in `script.js`.
- For DCF enhancements, prefer adding fields/functions rather than altering existing keys/function contracts.
- Validate that both tabs and theme toggle still work after changes.
