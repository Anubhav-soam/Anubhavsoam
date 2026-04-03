import React, { useMemo, useState } from 'react';
import { fetchScreenerData } from './api';
import { buildSensitivityGrid, runDcf, toCurrencyINR } from './dcf';
import FinancialTables from './components/FinancialTables';
import RatiosCard from './components/RatiosCard';
import DcfPanel from './components/DcfPanel';
import TrendCharts from './components/TrendCharts';

const DEFAULT_ASSUMPTIONS = {
  revenueGrowth: 10,
  wacc: 12,
  terminalGrowth: 4
};

export default function App() {
  const [symbolInput, setSymbolInput] = useState('RELIANCE');
  const [companies, setCompanies] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [dataBySymbol, setDataBySymbol] = useState({});
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeData = selectedSymbol ? dataBySymbol[selectedSymbol] : null;

  const dcf = useMemo(() => {
    if (!activeData) return null;
    return runDcf({
      incomeStatement: activeData.incomeStatement,
      cashFlow: activeData.cashFlow,
      assumptions
    });
  }, [activeData, assumptions]);

  const sensitivity = useMemo(() => {
    if (!dcf) return null;
    return buildSensitivityGrid(dcf, assumptions);
  }, [dcf, assumptions]);

  async function onFetch() {
    const symbols = symbolInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (!symbols.length) {
      setError('Enter at least one symbol.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const results = await Promise.all(symbols.map(async (symbol) => {
        const payload = await fetchScreenerData(symbol);
        return [symbol, payload];
      }));
      const next = Object.fromEntries(results);
      setDataBySymbol((prev) => ({ ...prev, ...next }));
      setCompanies((prev) => Array.from(new Set([...prev, ...symbols])));
      setSelectedSymbol(symbols[0]);
    } catch (err) {
      setError(err.message || 'Fetch failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="card">
        <h1>Automated DCF Modeler</h1>
        <p>Scrapes Screener.in financials, runs DCF, and visualizes revenue/FCF trends.</p>

        <div className="form-row">
          <input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            placeholder="RELIANCE or RELIANCE,TCS"
          />
          <button type="button" onClick={onFetch} disabled={loading}>
            {loading ? 'Loading...' : 'Fetch Financials'}
          </button>
        </div>

        <div className="form-row assumptions">
          <label>Revenue Growth (%)
            <input type="number" value={assumptions.revenueGrowth} onChange={(e) => setAssumptions((p) => ({ ...p, revenueGrowth: Number(e.target.value) }))} />
          </label>
          <label>WACC (%)
            <input type="number" value={assumptions.wacc} onChange={(e) => setAssumptions((p) => ({ ...p, wacc: Number(e.target.value) }))} />
          </label>
          <label>Terminal Growth (%)
            <input type="number" value={assumptions.terminalGrowth} onChange={(e) => setAssumptions((p) => ({ ...p, terminalGrowth: Number(e.target.value) }))} />
          </label>
        </div>

        {companies.length > 1 && (
          <div className="form-row">
            <label>Select Company
              <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
                {companies.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
              </select>
            </label>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </header>

      {dcf && (
        <section className="card">
          <h3>Sensitivity Analysis (WACC vs Terminal Growth)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TG \\ WACC</th>
                  {sensitivity.waccRange.map((w) => <th key={w}>{w.toFixed(1)}%</th>)}
                </tr>
              </thead>
              <tbody>
                {sensitivity.grid.map((row) => (
                  <tr key={row.terminalGrowth}>
                    <th>{row.terminalGrowth.toFixed(1)}%</th>
                    {row.values.map((value, idx) => <td key={`${row.terminalGrowth}-${idx}`}>{value == null ? '—' : toCurrencyINR(value)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <RatiosCard ratios={activeData?.ratios} />
      <DcfPanel dcf={dcf} />
      <TrendCharts dcf={dcf} />
      <FinancialTables data={activeData} />
    </main>
  );
}
