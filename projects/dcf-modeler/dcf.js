(function initTheme() {
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
  }

  applyTheme(localStorage.getItem('theme') || 'dark');
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
})();

async function getDCF() {
  const resultEl = document.getElementById('result');
  const symbolEl = document.getElementById('symbol');
  const company = String(symbolEl?.value || '').trim();

  if (!company) {
    resultEl.innerText = 'Please enter a valid symbol (e.g., RELIANCE.NS).';
    return;
  }

  resultEl.innerText = 'Calculating...';

  try {
    const res = await fetch('https://dcf-backend-0jpy.onrender.com/dcf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company: company
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || 'DCF API request failed');
    }

    const valuePerShare = data?.result?.value_per_share ?? data?.value_per_share;

    if (valuePerShare === undefined || valuePerShare === null || Number.isNaN(Number(valuePerShare))) {
      throw new Error('Invalid response from DCF API');
    }

    resultEl.innerText = `Value per Share: ₹ ${Number(valuePerShare).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  } catch (err) {
    resultEl.innerText = 'Error calculating DCF';
    console.error(err);
  }
}

window.getDCF = getDCF;
