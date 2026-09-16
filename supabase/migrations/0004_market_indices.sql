-- Exchange index history (e.g. "BSE DCI"). System-managed: written only by
-- refreshMarketData via the service role. One row per index code.
create table public.market_indices (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  code text not null unique,
  name text not null,
  exchange text not null,
  currency text not null default 'BWP',
  points jsonb not null default '[]'::jsonb, -- [{date, value}, ...] oldest-first
  last_value numeric,
  last_updated timestamptz
);
alter table public.market_indices enable row level security;
create policy "read" on public.market_indices for select using (auth.role() = 'authenticated');
-- No insert/update/delete policy for regular users — only the service role
-- (which bypasses RLS) writes here, same pattern as MarketDataRequest.
create trigger touch before update on public.market_indices for each row execute function public.touch_updated_date();
