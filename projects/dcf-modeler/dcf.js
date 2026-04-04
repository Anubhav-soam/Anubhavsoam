const BACKEND_URL = (window.DCF_BACKEND_URL || 'https://dcf-backend-docker.onrender.com').replace(/\/$/, '');

const fmtInr = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtPct = (n) => `${(Number(n || 0) * 100).toFixed(2)}%`;

function readNumber(id) {
  const raw = document.getElementById(id)?.value ?? '';
  if (raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
}

function bootstrapTheme() {
  applyTheme(localStorage.getItem('theme') || 'dark');
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function payloadFromForm() {
  const company = String(document.getElementById('symbol')?.value || '').trim();
  const growth = readNumber('growth');
  const ebitMargin = readNumber('ebit_margin');
  const deprPct = readNumber('depr_pct');
  const nwcPct = readNumber('nwc_pct');
  const capexPct = readNumber('capex_pct');

  return {
    company,
    growth: growth == null ? null : growth / 100,
    ebit_margin: ebitMargin == null ? null : ebitMargin / 100,
    depr_pct: deprPct == null ? null : deprPct / 100,
    nwc_pct: nwcPct == null ? null : nwcPct / 100,
    capex_pct: capexPct == null ? null : capexPct / 100,
    shares: readNumber('shares'),
    wacc: (readNumber('wacc') ?? 12) / 100,
    terminal_growth: (readNumber('terminal_growth') ?? 3) / 100,
    tax: (readNumber('tax') ?? 18) / 100
  };
}

function renderSensitivity(sensitivity) {
  const table = document.getElementById('sensTable');
  if (!table || !sensitivity?.length) {
    if (table) table.innerHTML = '';
    return;
  }

  const waccKeys = Object.keys(sensitivity[0].values || {});
  let html = '<thead><tr><th>TG \\ WACC</th>';
  waccKeys.forEach((k) => { html += `<th>${k}%</th>`; });
  html += '</tr></thead><tbody>';

  sensitivity.forEach((row) => {
    html += `<tr><th>${row.terminal_growth}%</th>`;
    waccKeys.forEach((k) => {
      const value = row.values[k];
      html += `<td>${value == null ? '—' : Number(value).toFixed(2)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody>';
  table.innerHTML = html;
}

async function getDCF() {
  const resultEl = document.getElementById('result');
  const evOut = document.getElementById('evOut');
  const eqOut = document.getElementById('eqOut');
  const psOut = document.getElementById('psOut');

  const payload = payloadFromForm();
  if (!payload.company) {
    resultEl.innerText = 'Please enter a company symbol (e.g., RELIANCE.NS)';
    return;
  }

  resultEl.innerText = 'Calculating...';
  evOut.textContent = '—';
  eqOut.textContent = '—';
  psOut.textContent = '—';

  try {
    const res = await fetch(`${BACKEND_URL}/dcf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json()
      : { error: await res.text() };

    if (!res.ok) throw new Error(data?.error || `API request failed (${res.status})`);

    evOut.textContent = fmtInr(data.enterprise_value);
    eqOut.textContent = fmtInr(data.equity_value);
    psOut.textContent = fmtInr(data.value_per_share);
    renderSensitivity(data.sensitivity);

    const assumptions = data.assumptions || {};
    resultEl.innerText = `Done. Growth ${fmtPct(assumptions.growth)} | EBIT margin ${fmtPct(assumptions.ebit_margin)} | WACC ${fmtPct(assumptions.wacc)} | TG ${fmtPct(assumptions.terminal_growth)}`;
  } catch (err) {
    resultEl.innerText = `Error calculating DCF: ${err.message}`;
  }
}

window.getDCF = getDCF;

(function init() {
  bootstrapTheme();
})();
