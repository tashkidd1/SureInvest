// Frontend currency layer. Mirrors the backend shared/currency.ts logic. The
// USD/BWP rate is cached in the ExchangeRate entity and fetched once per
// session (module-level cached promise); a configurable fallback is used when
// the provider is unavailable, so valuation is never 0/null.
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
export const FALLBACK_USD_BWP = 13.5;
const CURRENCY_SYMBOL = { BWP: "P", USD: "$" };
const CURRENCY_LOCALE = "en-BW";
export function currencySymbol(currency) {
  return CURRENCY_SYMBOL[currency] || (currency || "");
}
// Format a value in its native currency (P for BWP, $ for USD). symbol=true
// prepends the currency symbol.
export function formatMoney(value, currency = "BWP", { compact = false, symbol = true, decimals } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return symbol ? `${CURRENCY_SYMBOL[currency] || ""}—` : "—";
  }
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: decimals ?? (compact ? 1 : 2),
    minimumFractionDigits: 0,
  }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return symbol ? `${sign}${CURRENCY_SYMBOL[currency] || ""}${formatted}` : `${sign}${formatted}`;
}
// Convert a native-currency amount to BWP. BWP passes through; others multiply
// by the rate. If the rate is invalid, the native amount is returned unchanged.
export function nativeToBwp(amount, currency, rate) {
  const value = Number(amount) || 0;
  if (!currency || currency === "BWP") return value;
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return value;
  return value * r;
}
async function fetchUsdBwpRate() {
  try {
    const rows = await base44.entities.ExchangeRate.list("-last_updated", 10);
    const usdBwp = rows.find((r) => r.base === "USD" && r.quote === "BWP");
    const rate = Number(usdBwp?.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : FALLBACK_USD_BWP;
  } catch {
    return FALLBACK_USD_BWP;
  }
}
// Session-cached rate — the portfolio, cards and trade modal all share one
// fetch. Never returns 0; falls back to FALLBACK_USD_BWP.
let _ratePromise = null;
export function getUsdBwpRate() {
  if (!_ratePromise) _ratePromise = fetchUsdBwpRate();
  return _ratePromise;
}
// Clear the session-cached rate so the next getUsdBwpRate()/useUsdBwpRate()
// re-reads the ExchangeRate entity — used after an admin market-data refresh
// so a new USD/BWP rate reaches valuation without a page reload.
export function resetUsdBwpRateCache() {
  _ratePromise = null;
}
// React hook: the cached USD/BWP rate, ready for synchronous conversion in
// render. Starts at the fallback and updates once the cached row resolves.
export function useUsdBwpRate() {
  const [rate, setRate] = useState(FALLBACK_USD_BWP);
  useEffect(() => {
    let alive = true;
    getUsdBwpRate().then((r) => { if (alive) setRate(r); });
    return () => { alive = false; };
  }, []);
  return rate;
}
