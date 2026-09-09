// Formatting helpers used across the app.
import { BRAND } from "./brand";
const CURRENCY_LOCALE = "en-BW";
export function formatCurrency(value, { compact = false, symbol = true, decimals } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return symbol ? `${BRAND.currencySymbol}—` : "—";
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: decimals ?? (compact ? 1 : 2),
    minimumFractionDigits: 0,
  }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return symbol ? `${sign}${BRAND.currencySymbol}${formatted}` : `${sign}${formatted}`;
}
export function formatNumber(value, { compact = false, decimals = 2 } = {}) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: decimals,
  }).format(value);
}
export function formatPercent(value, { withSign = true, decimals = 2 } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}
export function formatDate(date, { withTime = false } = {}) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}
export function changeTone(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}
