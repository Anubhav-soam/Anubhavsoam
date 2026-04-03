const numberFrom = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || '').replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export function toCurrencyINR(value) {
  return `₹ ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function extractRevenueSeries(incomeStatement = []) {
  return incomeStatement
    .map((row) => ({
      year: row.year,
      revenue: numberFrom(row?.['Sales +'] ?? row?.Sales ?? row?.Revenue ?? row?.['Revenue From Operations'])
    }))
    .filter((row) => row.year && row.revenue)
    .sort((a, b) => Number(a.year) - Number(b.year));
}

function extractFcfSeries(cashFlow = []) {
  return cashFlow
    .map((row) => {
      const operatingCashFlow = numberFrom(row?.['Cash from Operating Activity +'] ?? row?.['Cash from Operating Activities'] ?? row?.['Net Cash from Operating Activities']);
      const capexRaw = numberFrom(row?.['Fixed assets purchased'] ?? row?.['Capital expenditure'] ?? row?.Capex ?? row?.['Purchase of fixed assets']);
      const capex = Math.abs(capexRaw);
      return {
        year: row.year,
        operatingCashFlow,
        capex,
        fcf: operatingCashFlow - capex
      };
    })
    .filter((row) => row.year && (row.operatingCashFlow || row.capex))
    .sort((a, b) => Number(a.year) - Number(b.year));
}

export function runDcf({ incomeStatement, cashFlow, assumptions }) {
  const revenueSeries = extractRevenueSeries(incomeStatement);
  const fcfSeries = extractFcfSeries(cashFlow);

  if (!revenueSeries.length) throw new Error('Revenue history missing from scraped income statement.');
  if (!fcfSeries.length) throw new Error('Cash flow history missing (needs OCF + CapEx).');

  const lastRevenue = revenueSeries[revenueSeries.length - 1].revenue;
  const lastFcf = fcfSeries[fcfSeries.length - 1].fcf;

  const growth = assumptions.revenueGrowth / 100;
  const wacc = assumptions.wacc / 100;
  const terminalGrowth = assumptions.terminalGrowth / 100;

  if (wacc <= terminalGrowth) {
    throw new Error('WACC must be greater than terminal growth.');
  }

  const fcfMargin = lastRevenue ? lastFcf / lastRevenue : 0;
  const forecast = [];
  let enterpriseValue = 0;

  for (let yearIndex = 1; yearIndex <= 5; yearIndex += 1) {
    const revenue = lastRevenue * ((1 + growth) ** yearIndex);
    const fcff = revenue * fcfMargin;
    const discountedFcf = fcff / ((1 + wacc) ** yearIndex);
    forecast.push({ yearIndex, revenue, fcff, discountedFcf });
    enterpriseValue += discountedFcf;
  }

  const terminalFcf = forecast[forecast.length - 1].fcff * (1 + terminalGrowth);
  const terminalValue = terminalFcf / (wacc - terminalGrowth);
  const discountedTerminalValue = terminalValue / ((1 + wacc) ** 5);
  enterpriseValue += discountedTerminalValue;

  const intrinsicValue = enterpriseValue;

  return {
    revenueSeries,
    fcfSeries,
    forecast,
    terminalValue,
    discountedTerminalValue,
    enterpriseValue,
    intrinsicValue
  };
}

export function buildSensitivityGrid(base, assumptions) {
  const waccRange = [-2, -1, 0, 1, 2].map((d) => assumptions.wacc + d);
  const growthRange = [-1, -0.5, 0, 0.5, 1].map((d) => assumptions.terminalGrowth + d);

  const grid = growthRange.map((terminalGrowth) => {
    return {
      terminalGrowth,
      values: waccRange.map((wacc) => {
        const w = wacc / 100;
        const g = terminalGrowth / 100;
        if (w <= g || w <= 0) return null;

        const pvForecast = base.forecast.reduce(
          (acc, row) => acc + (row.fcff / ((1 + w) ** row.yearIndex)),
          0
        );
        const terminalFcf = base.forecast[base.forecast.length - 1].fcff * (1 + g);
        const terminalValue = terminalFcf / (w - g);
        const pvTerminal = terminalValue / ((1 + w) ** 5);
        return pvForecast + pvTerminal;
      })
    };
  });

  return { waccRange, growthRange, grid };
}
