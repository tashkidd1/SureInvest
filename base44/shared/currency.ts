// Currency conversion layer — provider-independent. The USD/BWP rate is
// cached in the ExchangeRate entity (refreshed from Twelve Data when available,
// otherwise a configurable fallback). Portfolio/trade math calls getUsdBwpRate
// once per operation and converts native amounts to BWP; the rate is NEVER 0
// or null, so valuation is always well-defined even on provider failure.
export const FALLBACK_USD_BWP = 13.5;
// Returns a guaranteed-positive USD→BWP rate. Reads the cached ExchangeRate
// row; falls back to FALLBACK_USD_BWP if the row is missing or invalid.
export async function getUsdBwpRate(base44) {
  const rows = await base44.asServiceRole.entities.ExchangeRate.list('-last_updated', 10);
  const usdBwp = rows.find((r) => r.base === 'USD' && r.quote === 'BWP');
  const rate = Number(usdBwp?.rate);
  return Number.isFinite(rate) && rate > 0 ? rate : FALLBACK_USD_BWP;
}
// Convert a native-currency amount to BWP. BWP passes through unchanged; other
// currencies multiply by the rate. If the rate is somehow invalid, the native
// amount is returned unchanged (defensive — getUsdBwpRate should prevent this).
export function nativeToBwp(amount, currency, rate) {
  const value = Number(amount) || 0;
  if (!currency || currency === 'BWP') return value;
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return value;
  return value * r;
}
