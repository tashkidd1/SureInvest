-- Replace the temporary educational fundamentals with provider-backed fields.
-- Do not invent market cap, P/E or dividend yield values when the configured
-- market-data plan cannot supply them.

alter table public.investments
  add column if not exists fundamentals_source text,
  add column if not exists fundamentals_updated_at timestamptz;

update public.investments
set
  market_cap = null,
  pe_ratio = null,
  dividend_yield = null,
  fundamentals_source = null,
  fundamentals_updated_at = null;
