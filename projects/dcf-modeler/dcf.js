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

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || 'API request failed');
    }

    const valuePerShare = data?.result?.value_per_share;
    if (valuePerShare === undefined || valuePerShare === null) {
      throw new Error('Invalid API response');
    }

    resultEl.innerText = 'Value per Share: ₹ ' + valuePerShare;
  } catch (err) {
    resultEl.innerText = 'Error calculating DCF';
  }
}

window.getDCF = getDCF;
