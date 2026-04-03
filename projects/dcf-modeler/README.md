# Automated DCF Modeler (Screener Scraper + React UI)

Production-oriented architecture:
- `frontend/` → React + Vite UI (deploy to GitHub Pages)
- `api/` → Vercel serverless scraping endpoint using axios + cheerio

## Features
- Scrapes Screener company page: `https://www.screener.in/company/{SYMBOL}/`
- Extracts:
  - Profit & Loss
  - Balance Sheet
  - Cash Flow
  - Top ratios
- DCF valuation with editable assumptions:
  - Revenue growth
  - WACC
  - Terminal growth
- FCF logic:
  - `FCF = Operating Cash Flow - CapEx`
- 5-year DCF forecast + terminal value
- Revenue and FCF trend charts (Chart.js)
- Bonus:
  - Multi-company fetch (comma-separated symbols)
  - Sensitivity analysis grid (WACC vs terminal growth)

## Local development

### 1) Install dependencies
```bash
cd projects/dcf-modeler
npm install
npm --prefix frontend install
```

### 2) Run frontend
```bash
npm --prefix frontend run dev
```
Frontend starts on `http://localhost:5174`.

### 3) Run backend locally
Use Vercel CLI:
```bash
npm i -g vercel
cd projects/dcf-modeler
vercel dev
```
This exposes `/api/screener?symbol=RELIANCE`.

> In local dev, you can proxy frontend to backend or run both under Vercel dev.

## API contract
`GET /api/screener?symbol=RELIANCE`

Example response:
```json
{
  "incomeStatement": [],
  "balanceSheet": [],
  "cashFlow": [],
  "ratios": {},
  "fetchedAt": "2026-04-03T00:00:00.000Z",
  "cache": "MISS"
}
```

## Deployment

### Deploy backend to Vercel
1. Push repo to GitHub.
2. In Vercel, import repository.
3. Set project root as `projects/dcf-modeler`.
4. Deploy (Vercel auto-detects `api/` functions).
5. Note production backend URL, e.g. `https://your-dcf-api.vercel.app`.

### Deploy frontend to GitHub Pages
1. Build frontend:
   ```bash
   cd projects/dcf-modeler/frontend
   npm install
   npm run build
   ```
2. Publish `dist/` to GitHub Pages (via Actions or `gh-pages` branch).
3. Ensure frontend requests backend via absolute API base URL (for production).

## Notes
- No paid APIs or keys are required.
- Scraper includes user-agent and in-memory cache.
- Scraping selectors are defensive but may need updates if Screener changes markup.
