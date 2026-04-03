import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TrendCharts({ dcf }) {
  if (!dcf) return null;

  const revenueData = {
    labels: dcf.revenueSeries.map((r) => r.year),
    datasets: [{ label: 'Revenue', data: dcf.revenueSeries.map((r) => r.revenue), borderColor: '#5b8fff' }]
  };

  const fcfData = {
    labels: dcf.fcfSeries.map((r) => r.year),
    datasets: [{ label: 'FCF', data: dcf.fcfSeries.map((r) => r.fcf), borderColor: '#c8a96e' }]
  };

  return (
    <section className="card">
      <h3>Trend Charts</h3>
      <div className="chart-grid">
        <div><Line data={revenueData} /></div>
        <div><Line data={fcfData} /></div>
      </div>
    </section>
  );
}
