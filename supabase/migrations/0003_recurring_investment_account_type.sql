-- recurring_investments never actually got an account_type column in the
-- original migration, despite the frontend/functions assuming it exists —
-- this is what was breaking Auto-Invest plan creation with a Postgres error.
alter table public.recurring_investments
  add column if not exists account_type text not null default 'demo' check (account_type in ('demo', 'real'));
