import React from 'react';
import { toCurrencyINR } from '../dcf';

export default function DcfPanel({ dcf }) {
  if (!dcf) return null;

  return (
    <section className="card">
      <h3>DCF Output</h3>
      <div className="kpi-grid">
        <article><span>Enterprise Value</span><strong>{toCurrencyINR(dcf.enterpriseValue)}</strong></article>
        <article><span>Terminal Value</span><strong>{toCurrencyINR(dcf.terminalValue)}</strong></article>
        <article><span>Discounted Terminal Value</span><strong>{toCurrencyINR(dcf.discountedTerminalValue)}</strong></article>
        <article><span>Intrinsic Value</span><strong>{toCurrencyINR(dcf.intrinsicValue)}</strong></article>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Year</th><th>Forecast Revenue</th><th>FCF</th><th>Discounted FCF</th></tr>
          </thead>
          <tbody>
            {dcf.forecast.map((row) => (
              <tr key={row.yearIndex}>
                <td>Y{row.yearIndex}</td>
                <td>{toCurrencyINR(row.revenue)}</td>
                <td>{toCurrencyINR(row.fcff)}</td>
                <td>{toCurrencyINR(row.discountedFcf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
