// Mansa provider — Botswana Stock Exchange (BSE) market data. All
// Mansa-specific API interaction, ticker aliasing and response normalization
// live here; the MarketDataService owns orchestration, budgeting and cache
// writes. The frontend never sees Mansa field names or credentials.
//
// Verified Mansa behaviour (docs + live response, 2026-09-03):
//   GET https://mansaapi.com/api/v1/markets/exchanges/BSE/stocks?limit=200
//   Bearer auth (mansa_live_sk_...), free tier 100 requests/day.
//   { success, data: [{ ticker, name, price, change, change_pct, volume,
//     scraped_at }], meta: { exchange, currency: "BWP", price_unit: "major",
//     updated_at, data_freshness: "30_minutes" },
//     pagination: { total: 41, limit, offset, has_more } }
import { fetchWithTimeout } from './http.ts';
const API_BASE = 'https://mansaapi.com/api/v1/markets/exchanges/BSE/stocks';
const PAGE_LIMIT = 200; // docs: limit is capped at 200; BSE total is ~41 → one page
const MAX_PAGES = 3;    // hard stop so pagination can never blow the budget
// SureInvest curated tickers that differ from Mansa's canonical BSE tickers.
const TICKER_ALIASES = {
  LETL: 'LETS',    // Letshego Holdings
  SECH: 'SECHABA', // Sechaba Brewery Holdings
};
export function toMansaTicker(ticker) {
  return TICKER_ALIASES[ticker] || ticker;
}
// Normalize one raw Mansa stock row into the internal market-data shape.
// Returns null for invalid rows so the cache is never corrupted.
function normalizeStock(raw, currency) {
  const price = Number(raw && raw.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  const change = Number.isFinite(Number(raw.change)) ? Number(raw.change) : 0;
  const percent = Number.isFinite(Number(raw.change_pct)) ? Number(raw.change_pct) : 0;
  return {
    price,
    previous_close: Number.isFinite(price - change) ? price - change : price,
    daily_change: change,
    daily_change_percent: percent,
    currency: currency || 'BWP',
  };
}
// Fetch the full BSE stocks snapshot — one shared request for the whole
// exchange (preferred over per-stock calls). Quotes are keyed by Mansa ticker.
export async function fetchBseSnapshot(apiKey) {
  const quotes = {};
  let offset = 0;
  let pages = 0;
  let meta = null;
  while (pages < MAX_PAGES) {
    const res = await fetchWithTimeout(`${API_BASE}?limit=${PAGE_LIMIT}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, 30000);
    if (!res.ok) {
      return { ok: false, httpStatus: res.status, error: `Mansa returned HTTP ${res.status}`, quotes: {} };
    }
    const body = await res.json();
    if (!body || body.success === false) {
      const msg = body && body.error && body.error.message ? body.error.message : 'Mansa returned an error';
      return { ok: false, httpStatus: res.status, error: msg, quotes: {} };
    }
    const rows = Array.isArray(body.data) ? body.data : [];
    meta = body.meta || meta;
    for (const raw of rows) {
      const norm = normalizeStock(raw, meta && meta.currency);
      if (norm && raw.ticker) quotes[raw.ticker] = norm;
    }
    const pagination = body.pagination || {};
    offset += rows.length;
    pages += 1;
    if (!pagination.has_more || rows.length === 0) break;
  }
  return { ok: true, httpStatus: 200, quotes, updated_at: (meta && meta.updated_at) || null };
}
