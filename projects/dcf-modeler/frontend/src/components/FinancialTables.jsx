import React from 'react';

function RenderTable({ title, rows }) {
  if (!rows?.length) return null;

  const columns = Object.keys(rows[0]).filter((k) => k !== 'year');

  return (
    <section className="card">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Year</th>
              {columns.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year}>
                <td>{row.year}</td>
                {columns.map((col) => <td key={`${row.year}-${col}`}>{row[col] ?? '-'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function FinancialTables({ data }) {
  if (!data) return null;
  return (
    <>
      <RenderTable title="Income Statement" rows={data.incomeStatement} />
      <RenderTable title="Balance Sheet" rows={data.balanceSheet} />
      <RenderTable title="Cash Flow" rows={data.cashFlow} />
    </>
  );
}
