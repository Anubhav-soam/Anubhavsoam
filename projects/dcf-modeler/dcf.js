async function getDCF() {
  const company = String(document.getElementById('symbol')?.value || '').trim();
  const resultEl = document.getElementById('result');

  if (!company) {
    resultEl.innerText = 'Please enter a company symbol (e.g., RELIANCE.NS)';
    return;
  }

  resultEl.innerText = 'Calculating...';

  try {
    const res = await fetch('https://dcf-backend-docker.onrender.com/dcf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company: company
      })
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json()
      : { error: await res.text() };

    if (!res.ok) {
      throw new Error(data?.error || `API request failed (${res.status})`);
    }

    const valuePerShare = data?.value_per_share ?? data?.result?.value_per_share;
    if (valuePerShare === undefined || valuePerShare === null) {
      throw new Error('Invalid API response');
    }

    resultEl.innerText = `Value per Share: ₹ ${Number(valuePerShare).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  } catch (err) {
    resultEl.innerText = `Error calculating DCF: ${err.message}`;
  }
}

window.getDCF = getDCF;
