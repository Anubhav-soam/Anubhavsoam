import React from 'react';

export default function RatiosCard({ ratios }) {
  if (!ratios || !Object.keys(ratios).length) return null;

  return (
    <section className="card">
      <h3>Key Ratios</h3>
      <div className="ratio-grid">
        {Object.entries(ratios).map(([key, value]) => (
          <article key={key} className="ratio-item">
            <span>{key}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
