# DCF Modeler (Frontend) + Python DCF API (Backend)

This feature is split into:
- **Frontend (GitHub Pages)**: `projects/dcf-modeler/`
- **Backend (Render)**: `backend/dcf-api/`

## 1) Frontend files
- `projects/dcf-modeler/index.html`
- `projects/dcf-modeler/dcf.js`
- `projects/dcf-modeler/dcf.css`

The page sends `POST /dcf` with:
```json
{
  "company": "RELIANCE.NS",
  "growth": 0.1,
  "ebit_margin": 0.2,
  "depr_pct": 0.03,
  "nwc_pct": 0.02,
  "capex_pct": 0.05,
  "shares": 6700000000,
  "wacc": 0.12,
  "terminal_growth": 0.03,
  "tax": 0.18
}
```

## 2) Backend files
- `backend/dcf-api/app.py`
- `backend/dcf-api/requirements.txt`

## 3) Deploy backend on Render (exact steps)
1. Push this repository to GitHub.
2. Open Render → **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Configure:
   - **Root Directory**: `backend/dcf-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Click **Create Web Service**.
6. After deployment, verify:
   - `GET https://<your-render-url>/health` returns `{ "ok": true }`

## 4) Connect frontend to backend
1. Open `projects/dcf-modeler/dcf.js`.
2. Set the backend URL:
```js
window.DCF_BACKEND_URL = 'https://<your-render-url>';
```
(or set `const BACKEND_URL = 'https://<your-render-url>'` directly)
3. Commit and push to GitHub Pages branch.
4. Open the DCF page from your site and click **Calculate DCF**.

## Notes
- Keep `WACC > terminal_growth`.
- Use `.NS` symbols for NSE where needed (e.g., `RELIANCE.NS`).
