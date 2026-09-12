-- Supports the daily-append trendline logic in refreshMarketData (one point
-- per calendar day, since neither free-tier provider gives BSE history and
-- Twelve Data's /time_series backfill is a one-time seed, not a per-refresh
-- call).
alter table public.investments
  add column if not exists history_last_appended date;
