(function initDCFPage() {
  const BACKEND_URL = window.DCF_BACKEND_URL || 'https://YOUR_BACKEND_URL';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
  }

  function bootTheme() {
    applyTheme(localStorage.getItem('theme') || 'dark');
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  function num(id) {
    return Number(document.getElementById(id)?.value || 0);
  }

  function setStatus(msg) {
    const el = document.getElementById('statusText');
    if (el) el.textContent = msg;
  }

  function setError(msg) {
    const card = document.getElementById('errorCard');
    const text = document.getElementById('errorText');
    if (text) text.textContent = msg;
    if (card) card.hidden = false;
    const result = document.getElementById('resultCard');
    if (result) result.hidden = true;
  }

  function clearError() {
    const card = document.getElementById('errorCard');
    if (card) card.hidden = true;
  }

  function inr(value) {
    return `₹ ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  async function calculateDCF() {
    clearError();
    setStatus('Calculating...');

    const payload = {
      company: String(document.getElementById('company')?.value || '').trim(),
      growth: num('growth') / 100,
      ebit_margin: num('ebit_margin') / 100,
      wacc: num('wacc') / 100,
      terminal_growth: num('terminal_growth') / 100,
      tax: num('tax') / 100
    };

    if (!payload.company) {
      setStatus('');
      setError('Please enter a valid company symbol.');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/dcf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'API request failed.');
      }

      document.getElementById('valuePerShare').textContent = inr(data.value_per_share);
      document.getElementById('enterpriseValue').textContent = inr(data.enterprise_value);
      document.getElementById('equityValue').textContent = inr(data.equity_value);
      document.getElementById('resultCard').hidden = false;
      setStatus('Done');
    } catch (err) {
      setStatus('');
      setError(err.message || 'Unable to calculate DCF. Check backend URL and symbol.');
    }
  }

  document.getElementById('calculateBtn')?.addEventListener('click', calculateDCF);
  bootTheme();
})();
