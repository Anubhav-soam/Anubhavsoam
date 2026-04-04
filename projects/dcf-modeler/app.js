const fmtCr = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
const fmtPs = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function val(id) {
  return Number(document.getElementById(id)?.value || 0);
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

function buildForecast() {
  const baseRevenue = val('revenueBase');
  const revenueGrowth = val('revenueGrowth') / 100;
  const ebitMargin = val('ebitMargin') / 100;
  const taxRate = val('taxRate') / 100;
  const deprPct = val('deprPct') / 100;
  const capexPct = val('capexPct') / 100;
  const nwcPct = val('nwcPct') / 100;
  const wacc = val('wacc') / 100;
  const terminalGrowth = val('terminalGrowth') / 100;
  const shares = Math.max(0.0001, val('shares'));
  const years = Math.min(10, Math.max(3, Math.floor(val('years') || 5)));

  if (wacc <= terminalGrowth) {
    throw new Error('WACC must be greater than terminal growth for valid terminal value.');
  }

  const rows = [];
  let revenue = baseRevenue;
  let ev = 0;

  for (let y = 1; y <= years; y += 1) {
    revenue *= 1 + revenueGrowth;
    const ebit = revenue * ebitMargin;
    const nopat = ebit * (1 - taxRate);
    const depr = revenue * deprPct;
    const capex = revenue * capexPct;
    const deltaNwc = revenue * nwcPct;
    const fcff = nopat + depr - capex - deltaNwc;
    const pvFcff = fcff / ((1 + wacc) ** y);
    rows.push({ y, revenue, ebit, nopat, depr, capex, deltaNwc, fcff, pvFcff });
    ev += pvFcff;
  }

  const lastFcff = rows[rows.length - 1].fcff;
  const terminalValue = (lastFcff * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  const pvTerminal = terminalValue / ((1 + wacc) ** years);
  ev += pvTerminal;

  const equityValue = ev + val('cash') - val('netDebt');
  const fairValuePerShare = equityValue / shares;

  return {
    rows,
    ev,
    equityValue,
    fairValuePerShare,
    wacc,
    terminalGrowth,
    terminalValue,
    pvTerminal,
    shares
  };
}

function renderProjection(result) {
  const body = document.getElementById('projectionBody');
  if (!body) return;
  body.innerHTML = result.rows.map((r) => `
    <tr>
      <td>Y${r.y}</td>
      <td>${fmtCr(r.revenue)}</td>
      <td>${fmtCr(r.ebit)}</td>
      <td>${fmtCr(r.nopat)}</td>
      <td>${fmtCr(r.depr)}</td>
      <td>${fmtCr(r.capex)}</td>
      <td>${fmtCr(r.deltaNwc)}</td>
      <td>${fmtCr(r.fcff)}</td>
      <td>${fmtCr(r.pvFcff)}</td>
    </tr>
  `).join('') + `
    <tr>
      <td>Terminal PV</td>
      <td colspan="7">-</td>
      <td>${fmtCr(result.pvTerminal)}</td>
    </tr>
  `;
}

function renderSensitivity(baseResult) {
  const tableRoot = document.getElementById('sensitivityTable');
  if (!tableRoot) return;

  const waccList = [];
  const tgList = [];
  for (let i = -5; i <= 5; i += 1) waccList.push(baseResult.wacc + (i / 100));
  for (let i = -2; i <= 2; i += 1) tgList.push(baseResult.terminalGrowth + (i / 100));

  let html = '<table><thead><tr><th>TG \\ WACC</th>';
  waccList.forEach((w) => { html += `<th>${(w * 100).toFixed(1)}%</th>`; });
  html += '</tr></thead><tbody>';

  const lastFcff = baseResult.rows[baseResult.rows.length - 1].fcff;
  const years = baseResult.rows.length;

  tgList.forEach((tg) => {
    html += `<tr><th>${(tg * 100).toFixed(1)}%</th>`;
    waccList.forEach((wacc) => {
      if (wacc <= tg || wacc <= 0) {
        html += '<td>—</td>';
        return;
      }
      const pvFlows = baseResult.rows.reduce((acc, row) => acc + row.fcff / ((1 + wacc) ** row.y), 0);
      const terminalValue = (lastFcff * (1 + tg)) / (wacc - tg);
      const pvTerminal = terminalValue / ((1 + wacc) ** years);
      const equity = pvFlows + pvTerminal + val('cash') - val('netDebt');
      const perShare = equity / baseResult.shares;
      html += `<td>${Number(perShare).toFixed(2)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  tableRoot.innerHTML = html;
}

function runModel() {
  try {
    const result = buildForecast();
    document.getElementById('kpiEv').textContent = fmtCr(result.ev);
    document.getElementById('kpiEq').textContent = fmtCr(result.equityValue);
    document.getElementById('kpiPs').textContent = fmtPs(result.fairValuePerShare);
    renderProjection(result);
    renderSensitivity(result);
  } catch (err) {
    alert(err.message);
  }
}

(function init() {
  bootstrapTheme();
  document.getElementById('runModel')?.addEventListener('click', runModel);
  runModel();
})();
