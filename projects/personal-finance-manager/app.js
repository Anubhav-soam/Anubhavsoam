const fmt = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const STORAGE_KEY = 'cfp_dashboard_state_v1';
const todayISO = () => new Date().toISOString().slice(0, 10);
const parseDateInput = (value) => {
  if (!value) return null;
  const v = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const state = {
  family: [],
  income: [],
  expenseMaster: [
    ['Housing & Utilities', 'House rent'], ['Housing & Utilities', 'Electricity bill'], ['Housing & Utilities', 'Internet / broadband'],
    ['Food & Groceries', 'Monthly groceries'], ['Food & Groceries', 'Milk & dairy supplies'], ['Food & Groceries', 'Eating out / food delivery'],
    ['Transportation', 'Fuel / transport'], ['Transportation', 'Parking / tolls'],
    ['Child & Education', 'School / tuition fees'], ['Child & Education', 'Books & stationery'],
    ['Health & Wellness', 'Medicines'], ['Health & Wellness', 'Insurance premium'],
    ['Entertainment & Lifestyle', 'Movies / outings'], ['Entertainment & Lifestyle', 'Clothing'],
    ['Household Support & Services', 'Maid / domestic help'], ['Social & Personal', 'Discretionary spending']
  ],
  expenseValues: Array(16).fill(0),
  loanMaster: ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Credit Card Outstanding', 'Other Loans'],
  loanData: Array(6).fill(0).map(() => ({ amount: 0, emi: 0, endDate: todayISO(), yearsLeft: 0 })),
  goalMaster: ['Buying Home', 'Child Education', 'Emergency Fund', 'Retirement Corpus', 'Medical Emergency', 'Starting a Business'],
  goalData: Array(6).fill(0).map(() => ({ present: 0, years: 0, future: 0 })),
  inflation: 0.05,
  annualReturn: 0.12,
  currentAge: 30,
  retirementAge: 60,
  startCorpus: 0,
};

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved && typeof saved === 'object') Object.assign(state, saved);
  } catch {}
}
function activeTab() { return document.querySelector('.tab.active')?.dataset.tab || 'profile'; }
function bindTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.tab,.panel').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      renderAll();
    };
  });
}
function setupGlobalActions() {
  document.getElementById('export_state').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `client-financial-profile-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  document.getElementById('import_state').onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      Object.assign(state, imported);
      renderAll();
    } catch {
      alert('Invalid JSON file.');
    }
  };
  document.getElementById('reset_state').onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };
}
const num = (id) => Number(document.getElementById(id)?.value || 0);
function monthlyIncome() { return state.income.reduce((a, b) => a + Number(b.income || 0), 0) / 12; }
function monthlyExpense() { return state.expenseValues.reduce((a, b) => a + Number(b || 0), 0); }
function monthlyEmi() { return state.loanData.reduce((a, b) => a + Number(b.emi || 0), 0); }
function monthlyNet() { return monthlyIncome() - monthlyExpense() - monthlyEmi(); }

function renderProfile() {
  const expenseGroups = state.expenseMaster.reduce((acc, [cat, sub], i) => {
    acc[cat] ??= []; acc[cat].push({ sub, i }); return acc;
  }, {});
  document.getElementById('profile').innerHTML = `
    <div class="grid-2">
      <section class="section-card">
        <h2>Family Profile</h2>
        <div class="form-grid">
          <input id="f_name" placeholder="Family member name">
          <select id="f_rel"><option>Head</option><option>Spouse</option><option>Son</option><option>Daughter</option><option>Parent</option></select>
          <input id="f_dob" type="date">
          <select id="f_gender"><option>Male</option><option>Female</option></select>
          <button class="primary-btn" id="add_family" type="button">Add Family Member</button>
        </div>
        <div class="table-wrap">
          <table class="list-table"><thead><tr><th>Name</th><th>Relation</th><th>DOB</th><th>Age</th><th>Gender</th><th></th></tr></thead><tbody>
          ${state.family.map((r, i) => `<tr><td>${r.name}</td><td>${r.relation}</td><td>${r.dob || ''}</td><td>${r.age}</td><td>${r.gender}</td><td><button data-del-family="${i}">❌</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No family members added yet.</td></tr>'}
          </tbody></table>
        </div>
      </section>
      <section class="section-card">
        <h2>Earning Members</h2>
        <div class="form-grid compact">
          <select id="i_member">${state.family.length ? state.family.map((f, i) => `<option value="${i}">${f.name} (${f.relation})</option>`).join('') : '<option value="">Add family members first</option>'}</select>
          <input id="i_age" placeholder="Age" readonly>
          <input id="i_income" type="number" placeholder="Annual income">
          <button class="primary-btn" id="add_income" type="button">Add Income</button>
        </div>
        <p class="summary-note">Total Annual Income: <span class="highlight">${fmt(monthlyIncome() * 12)}</span></p>
        <div class="table-wrap">
          <table class="list-table"><thead><tr><th>Name</th><th>Age</th><th>Income</th><th></th></tr></thead><tbody>
          ${state.income.map((r, i) => `<tr><td>${r.name}</td><td>${r.age}</td><td>${fmt(r.income)}</td><td><button data-del-income="${i}">❌</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">No earning members added yet.</td></tr>'}
          </tbody></table>
        </div>
      </section>
    </div>
    <div class="metrics-grid">
      <article class="metric-card"><span>Monthly Income</span><strong>${fmt(monthlyIncome())}</strong></article>
      <article class="metric-card"><span>Monthly Expenses</span><strong>${fmt(monthlyExpense())}</strong></article>
      <article class="metric-card"><span>Monthly EMI</span><strong>${fmt(monthlyEmi())}</strong></article>
      <article class="metric-card"><span>Net Monthly Savings</span><strong>${fmt(monthlyNet())}</strong></article>
    </div>
    <div class="grid-2">
      <section class="section-card">
        <h3>Monthly Expenses</h3>
        ${Object.entries(expenseGroups).map(([cat, rows], groupIndex) => `
          <details ${groupIndex === 0 ? 'open' : ''}>
            <summary>${cat} — ${fmt(rows.reduce((a, r) => a + Number(state.expenseValues[r.i] || 0), 0))}</summary>
            ${rows.map((r) => `<div class="expense-row"><label>${r.sub}</label><input data-exp="${r.i}" type="number" value="${state.expenseValues[r.i] || 0}"></div>`).join('')}
          </details>
        `).join('')}
      </section>
      <section class="section-card">
        <h3>Current Loans</h3>
        ${state.loanMaster.map((loan, i) => `
          <div class="loan-row">
            <label>${loan}</label>
            <input data-loan-amt="${i}" type="number" value="${state.loanData[i].amount}" placeholder="Amount">
            <input data-loan-emi="${i}" type="number" value="${state.loanData[i].emi}" placeholder="EMI">
            <input data-loan-date="${i}" type="date" value="${state.loanData[i].endDate}">
          </div>
        `).join('')}
      </section>
    </div>
    <div class="charts-grid">
      <section class="chart-card"><h3>Income Utilization</h3><div id="c_income" class="chart"></div></section>
      <section class="chart-card"><h3>Expense Distribution</h3><div id="c_exp" class="chart"></div></section>
      <section class="chart-card"><h3>EMI Distribution</h3><div id="c_emi" class="chart"></div></section>
    </div>`;

  document.getElementById('add_family').onclick = () => {
    const name = document.getElementById('f_name').value.trim();
    if (!name) return;
    const dob = document.getElementById('f_dob').value;
    const dobDate = parseDateInput(dob);
    state.family.push({ name, relation: document.getElementById('f_rel').value, dob, age: dobDate ? new Date().getFullYear() - dobDate.getFullYear() : 0, gender: document.getElementById('f_gender').value });
    renderAll();
  };
  document.querySelectorAll('[data-del-family]').forEach((b) => b.onclick = () => { state.family.splice(Number(b.dataset.delFamily), 1); renderAll(); });
  const memberSelect = document.getElementById('i_member');
  const ageInput = document.getElementById('i_age');
  if (memberSelect && ageInput) memberSelect.onchange = () => { const idx = Number(memberSelect.value); ageInput.value = state.family[idx]?.age ?? ''; };
  if (memberSelect && ageInput && state.family.length) { const idx = Number(memberSelect.value || 0); ageInput.value = state.family[idx]?.age ?? ''; }
  const addIncome = document.getElementById('add_income');
  if (addIncome) addIncome.onclick = () => {
    const idx = Number(document.getElementById('i_member').value);
    if (!state.family[idx]) return;
    state.income.push({ name: state.family[idx].name, age: state.family[idx].age, income: num('i_income') });
    renderAll();
  };
  document.querySelectorAll('[data-del-income]').forEach((b) => b.onclick = () => { state.income.splice(Number(b.dataset.delIncome), 1); renderAll(); });
  document.querySelectorAll('[data-exp]').forEach((i) => i.onchange = () => { state.expenseValues[Number(i.dataset.exp)] = Math.max(0, Number(i.value || 0)); renderAll(); });
  document.querySelectorAll('[data-loan-amt]').forEach((i) => i.onchange = () => { state.loanData[Number(i.dataset.loanAmt)].amount = Math.max(0, Number(i.value || 0)); renderAll(); });
  document.querySelectorAll('[data-loan-emi]').forEach((i) => i.onchange = () => { state.loanData[Number(i.dataset.loanEmi)].emi = Math.max(0, Number(i.value || 0)); renderAll(); });
  document.querySelectorAll('[data-loan-date]').forEach((i) => i.onchange = () => {
    const idx = Number(i.dataset.loanDate);
    state.loanData[idx].endDate = i.value;
    const d = parseDateInput(i.value);
    state.loanData[idx].yearsLeft = d ? Math.max(0, Math.round((((d - new Date()) / (1000 * 60 * 60 * 24 * 365)) * 10)) / 10) : 0;
    renderAll();
  });
  plotProfileCharts();
}

function buildAnalysis() {
  const monthlySavings = monthlyNet();
  const monthlyReturn = Number(state.annualReturn) / 12;
  const rows = state.goalMaster.map((goal, i) => {
    const d = state.goalData[i];
    const future = (d.present > 0 && d.years > 0) ? Math.round(d.present * ((1 + Number(state.inflation)) ** d.years)) : 0;
    d.future = future;
    const months = d.years * 12;
    const sip = (future > 0 && months > 0 && monthlyReturn > 0)
      ? Math.round(future * monthlyReturn / (((1 + monthlyReturn) ** months) - 1))
      : 0;
    return { goal, present: d.present, years: d.years, future, sip };
  });
  return { rows, totalSip: rows.reduce((a, b) => a + b.sip, 0), monthlySavings };
}

function renderGoals() {
  const { rows, totalSip, monthlySavings } = buildAnalysis();
  document.getElementById('goals').innerHTML = `
    <section class="section-card">
      <h2>Personal Financial Goals Planning</h2>
      <div class="form-grid compact">
        <input id="inflation" type="number" step="0.1" value="${state.inflation * 100}" placeholder="Inflation %">
        <input id="current_age" type="number" value="${state.currentAge}" placeholder="Current Age">
        <input id="retirement_age" type="number" value="${state.retirementAge}" placeholder="Retirement Age">
        <input id="annual_return" type="number" step="0.1" value="${state.annualReturn * 100}" placeholder="Expected Return %">
      </div>
      <p class="summary-note">Remaining Years to Retirement: <span class="highlight">${state.retirementAge - state.currentAge} years</span></p>
      <div class="table-wrap">
        <table><thead><tr><th>Goal</th><th>Present Cost</th><th>Years</th><th>Future Cost</th></tr></thead><tbody>
          ${rows.map((row, i) => `<tr><td>${row.goal}</td><td><input data-goal-present="${i}" type="number" value="${row.present}"></td><td><input data-goal-years="${i}" type="number" value="${row.years}"></td><td>${fmt(row.future)}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </section>
    <div class="metrics-grid">
      <article class="metric-card"><span>Total Goal Corpus (Future)</span><strong>${fmt(rows.reduce((a, b) => a + b.future, 0))}</strong></article>
      <article class="metric-card"><span>Total Monthly SIP Required</span><strong>${fmt(totalSip)}</strong></article>
      <article class="metric-card"><span>Available Monthly Savings</span><strong>${fmt(monthlySavings)}</strong></article>
      <article class="metric-card"><span>Monthly Gap / Surplus</span><strong>${fmt(monthlySavings - totalSip)}</strong></article>
    </div>`;
  document.getElementById('inflation').onchange = (e) => { state.inflation = Number(e.target.value || 0) / 100; renderAll(); };
  document.getElementById('current_age').onchange = (e) => { state.currentAge = Number(e.target.value || 0); renderAll(); };
  document.getElementById('retirement_age').onchange = (e) => { state.retirementAge = Number(e.target.value || 0); renderAll(); };
  document.getElementById('annual_return').onchange = (e) => { state.annualReturn = Number(e.target.value || 0) / 100; renderAll(); };
  document.querySelectorAll('[data-goal-present]').forEach((i) => i.onchange = () => { state.goalData[Number(i.dataset.goalPresent)].present = Number(i.value || 0); renderAll(); });
  document.querySelectorAll('[data-goal-years]').forEach((i) => i.onchange = () => { state.goalData[Number(i.dataset.goalYears)].years = Number(i.value || 0); renderAll(); });
}

function renderPlanning() {
  const { rows, totalSip } = buildAnalysis();
  const years = Math.max(1, state.retirementAge - state.currentAge);
  let corpus = Number(state.startCorpus || 0);
  const annualSip = totalSip * 12;
  const projectionRows = [];
  for (let year = 1; year <= years; year += 1) {
    const opening = corpus;
    corpus = Math.round((opening + annualSip) * (1 + Number(state.annualReturn || 0)));
    projectionRows.push({ year: state.currentAge + year, opening, sip: annualSip, closing: corpus });
  }
  document.getElementById('planning').innerHTML = `
    <div class="grid-2">
      <section class="section-card">
        <h2>Financial Planning Projection</h2>
        <div class="form-grid compact">
          <input id="start_corpus" type="number" value="${state.startCorpus}" placeholder="Current Corpus">
          <input id="plan_return" type="number" step="0.1" value="${state.annualReturn * 100}" placeholder="Expected Return %">
          <div class="metric-card"><span>Target Goal Corpus</span><strong>${fmt(rows.reduce((a, b) => a + b.future, 0))}</strong></div>
          <div class="metric-card"><span>Projected Corpus</span><strong>${fmt(projectionRows.at(-1)?.closing || 0)}</strong></div>
        </div>
        <p class="summary-note">Gap / Surplus: <span class="highlight">${fmt((projectionRows.at(-1)?.closing || 0) - rows.reduce((a, b) => a + b.future, 0))}</span></p>
      </section>
      <section class="chart-card"><h3>Corpus Growth</h3><div id="projection_chart" class="chart"></div></section>
    </div>
    <section class="table-card">
      <h3>Year-wise Projection</h3>
      <div class="table-wrap">
        <table><thead><tr><th>Year</th><th>Opening</th><th>SIP Contribution</th><th>Closing</th></tr></thead><tbody>
        ${projectionRows.map((row) => `<tr><td>${row.year}</td><td>${fmt(row.opening)}</td><td>${fmt(row.sip)}</td><td>${fmt(row.closing)}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </section>`;
  document.getElementById('start_corpus').onchange = (e) => { state.startCorpus = Number(e.target.value || 0); renderAll(); };
  document.getElementById('plan_return').onchange = (e) => { state.annualReturn = Number(e.target.value || 0) / 100; renderAll(); };
  if (window.Plotly) {
    Plotly.newPlot('projection_chart', [{
      type: 'scatter', mode: 'lines+markers',
      x: projectionRows.map((r) => r.year), y: projectionRows.map((r) => r.closing),
      line: { color: '#22c55e', width: 4 }, marker: { size: 8 }
    }], { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#dbeafe' }, margin: { t: 20, r: 20, b: 40, l: 50 } }, { displayModeBar: false });
  }
}

function plotProfileCharts() {
  if (!window.Plotly) return;
  const income = monthlyIncome();
  const expenses = monthlyExpense();
  const emi = monthlyEmi();
  const savings = Math.max(0, monthlyNet());
  Plotly.newPlot('c_income', [{ type: 'pie', labels: ['Expenses', 'EMI', 'Savings'], values: [expenses, emi, savings], hole: .62, marker: { colors: ['#fb7185', '#8b5cf6', '#22c55e'] } }], { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#dbeafe' }, margin: { t: 20, r: 20, b: 20, l: 20 } }, { displayModeBar: false });
  const catMap = {};
  state.expenseMaster.forEach(([cat], i) => { catMap[cat] = (catMap[cat] || 0) + Number(state.expenseValues[i] || 0); });
  const expenseCats = Object.keys(catMap).filter((k) => catMap[k] > 0);
  Plotly.newPlot('c_exp', [{ type: 'pie', labels: expenseCats.length ? expenseCats : ['No expenses'], values: expenseCats.length ? expenseCats.map((k) => catMap[k]) : [1], hole: .62 }], { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#dbeafe' }, margin: { t: 20, r: 20, b: 20, l: 20 } }, { displayModeBar: false });
  const emiRows = state.loanMaster.map((loan, i) => ({ loan, emi: Number(state.loanData[i].emi || 0) })).filter((x) => x.emi > 0);
  Plotly.newPlot('c_emi', [{ type: 'pie', labels: emiRows.length ? emiRows.map((x) => x.loan) : ['No EMI'], values: emiRows.length ? emiRows.map((x) => x.emi) : [1], hole: .62 }], { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#dbeafe' }, margin: { t: 20, r: 20, b: 20, l: 20 } }, { displayModeBar: false });
}

function renderAll() {
  renderProfile();
  renderGoals();
  renderPlanning();
  saveState();
  const tab = activeTab();
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.toggle('active', panel.id === tab));
  document.querySelectorAll('.tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
}

loadState();
bindTabs();
setupGlobalActions();
renderAll();
