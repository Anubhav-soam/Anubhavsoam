import axios from 'axios';
import { load } from 'cheerio';

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = globalThis.__SCREENER_CACHE__ || new Map();
globalThis.__SCREENER_CACHE__ = cache;

function parseCell(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractSectionTable($, sectionTitle) {
  const heading = $('h2, h3').filter((_, el) => parseCell($(el).text()).toLowerCase().includes(sectionTitle.toLowerCase())).first();
  if (!heading.length) return [];

  const table = heading.nextAll('table.data-table').first();
  if (!table.length) return [];

  const headers = [];
  table.find('thead tr th').each((_, th) => headers.push(parseCell($(th).text())));

  const rows = [];
  table.find('tbody tr').each((_, tr) => {
    const cells = [];
    $(tr).find('td').each((_, td) => cells.push(parseCell($(td).text())));
    if (!cells.length) return;

    const rowLabel = cells[0];
    for (let i = 1; i < cells.length; i += 1) {
      const year = headers[i] || `col_${i}`;
      const existing = rows.find((r) => r.year === year) || { year };
      existing[rowLabel] = cells[i];
      if (!rows.find((r) => r.year === year)) rows.push(existing);
    }
  });

  return rows;
}

function extractRatios($) {
  const ratios = {};

  $('.company-ratios li').each((_, li) => {
    const key = parseCell($(li).find('span.name').text());
    const value = parseCell($(li).find('span.number').text());
    if (key && value) ratios[key] = value;
  });

  if (!Object.keys(ratios).length) {
    $('.top-ratios li').each((_, li) => {
      const key = parseCell($(li).find('span.name').text());
      const value = parseCell($(li).find('span.number').text());
      if (key && value) ratios[key] = value;
    });
  }

  return ratios;
}

async function scrapeScreener(symbol) {
  const url = `https://www.screener.in/company/${encodeURIComponent(symbol)}/`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DCFModeler/1.0; +https://github.com/)',
      Accept: 'text/html,application/xhtml+xml'
    },
    timeout: 15000
  });

  const $ = load(response.data);

  const incomeStatement = extractSectionTable($, 'Profit & Loss');
  const balanceSheet = extractSectionTable($, 'Balance Sheet');
  const cashFlow = extractSectionTable($, 'Cash Flow');
  const ratios = extractRatios($);

  return { incomeStatement, balanceSheet, cashFlow, ratios, fetchedAt: new Date().toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  if (!symbol) {
    return res.status(400).json({ error: 'Query param "symbol" is required.' });
  }

  const cached = cache.get(symbol);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return res.status(200).json({ ...cached.data, cache: 'HIT' });
  }

  try {
    const data = await scrapeScreener(symbol);
    if (!data.incomeStatement.length && !data.balanceSheet.length && !data.cashFlow.length) {
      return res.status(502).json({ error: 'Unable to extract financial tables. Screener layout may have changed.' });
    }

    cache.set(symbol, { ts: Date.now(), data });
    return res.status(200).json({ ...data, cache: 'MISS' });
  } catch (error) {
    return res.status(500).json({
      error: 'Screener scrape failed.',
      details: error.message
    });
  }
}
