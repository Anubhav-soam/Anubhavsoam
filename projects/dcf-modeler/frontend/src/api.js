export async function fetchScreenerData(symbol, baseUrl = '') {
  const clean = String(symbol || '').trim().toUpperCase();
  if (!clean) throw new Error('Please enter a stock symbol.');

  const response = await fetch(`${baseUrl}/api/screener?symbol=${encodeURIComponent(clean)}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to fetch Screener data.');
  }

  return payload;
}
