// Twelve Data provider — Global market data. All Twelve Data-specific API
// interaction and response normalization live here; the MarketDataService
// owns orchestration, request budgeting and cache writes. Behaviour preserved
// from the original refreshMarketData implementation.
import { fetchWithTimeout } from './http.ts';
const API_BASE = 'https://api.twelvedata.com/quote';
// Maps a raw Twelve Data quote into the internal market-data shape.
// Returns null for error/invalid quotes so the cache is never corrupted.
function mapQuote(raw) {
  if (!raw || typeof raw !== 'object' || raw.status === 'error') return null;
  const price = Number(raw.close);
  if (!Number.isFinite(price)) return null;
  const change = Number.isFinite(Number(raw.change)) ? Number(raw.change) : 0;
  const percent = Number.isFinite(Number(raw.percent_change)) ? Number(raw.percent_change) : 0;
  const previous = Number.isFinite(Number(raw.previous_close))
    ? Number(raw.previous_close)
    : price - change;
  return {
    price,
    change,
    percent,
    previous,
    currency: raw.currency || raw.currency_name || null,
  };
}
// Fetch quotes for the given symbols in one batched request.
// Returns { ok, httpStatus, error } or { ok: true, quotes: { SYMBOL: quote } }.
export async function fetchQuotes(apiKey, symbols) {
  const url = `${API_BASE}?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${apiKey}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    return { ok: false, httpStatus: res.status, error: `Twelve Data returned HTTP ${res.status}`, quotes: {} };
  }
  const data = await res.json();
  if (data && data.status === 'error') {
    return { ok: false, httpStatus: res.status, error: data.message || 'Twelve Data returned an error', quotes: {} };
  }
  const quotes = {};
  for (const symbol of symbols) {
    // Batched responses are keyed by symbol; single-symbol responses are the quote itself.
    const raw = symbols.length > 1 ? data[symbol] : data;
    const q = mapQuote(raw);
    if (q) quotes[symbol] = q;
  }
  return { ok: true, httpStatus: res.status, quotes };
}
// Fetch the USD/BWP exchange rate. Any failure returns ok:false so the
// caller keeps the cached/fallback rate — never zeroed.
export async function fetchUsdBwpRate(apiKey) {
  const url = `${API_BASE}?symbol=${encodeURIComponent('USD/BWP')}&apikey=${apiKey}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return { ok: false, httpStatus: res.status, rate: null };
  const data = await res.json();
  if (data && data.status === 'error') return { ok: false, httpStatus: res.status, rate: null };
  const q = mapQuote(data);
  const rate = q && Number.isFinite(q.price) && q.price > 0 ? q.price : null;
  return { ok: !!rate, httpStatus: res.status, rate };
}
