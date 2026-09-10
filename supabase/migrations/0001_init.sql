-- InvestBW / SureInvest — initial schema, migrated off Base44.
-- Mirrors the field shapes and RLS rules from base44/entities/*.jsonc.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Roles: a thin table mirroring Base44's "User.role" (admin | user).
-- ---------------------------------------------------------------------
create table public.user_roles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_date timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create policy "read own role" on public.user_roles
  for select using (id = auth.uid());

-- Auto-provision a role row for every new auth user.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_roles (id, role) values (new.id, 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.user_roles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- updated_date auto-touch trigger, reused by every table below.
create function public.touch_updated_date()
returns trigger as $$
begin
  new.updated_date = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Helper macro (documented, not executable): every table gets
--   id uuid pk default gen_random_uuid()
--   created_by_id uuid references auth.users default auth.uid()
--   created_date / updated_date timestamptz
-- ---------------------------------------------------------------------

-- AppSetting — admin-writable, everyone (authenticated) can read.
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  key text not null,
  value text not null
);
alter table public.app_settings enable row level security;
create policy "read" on public.app_settings for select using (auth.role() = 'authenticated');
create policy "admin write" on public.app_settings for insert with check (public.is_admin());
create policy "admin update" on public.app_settings for update using (public.is_admin());
create policy "admin delete" on public.app_settings for delete using (public.is_admin());
create trigger touch before update on public.app_settings for each row execute function public.touch_updated_date();

-- CashAccount — owner-only.
create table public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  balance numeric not null default 0,
  currency text not null default 'BWP',
  available numeric,
  label text default 'Demo Cash Account',
  account_type text not null default 'demo' check (account_type in ('demo', 'real'))
);
alter table public.cash_accounts enable row level security;
create policy "owner read" on public.cash_accounts for select using (created_by_id = auth.uid());
create policy "owner insert" on public.cash_accounts for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.cash_accounts for update using (created_by_id = auth.uid());
create policy "owner delete" on public.cash_accounts for delete using (created_by_id = auth.uid());
create trigger touch before update on public.cash_accounts for each row execute function public.touch_updated_date();

-- Dividend — owner-only.
create table public.dividends (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  ticker text not null,
  name text not null,
  amount numeric not null,
  units numeric,
  ex_date date,
  pay_date date not null,
  status text not null default 'paid' check (status in ('paid', 'pending')),
  currency text not null default 'BWP'
);
alter table public.dividends enable row level security;
create policy "owner read" on public.dividends for select using (created_by_id = auth.uid());
create policy "owner insert" on public.dividends for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.dividends for update using (created_by_id = auth.uid());
create policy "owner delete" on public.dividends for delete using (created_by_id = auth.uid());
create trigger touch before update on public.dividends for each row execute function public.touch_updated_date();

-- EducationalContent — no rls block in source; treated as read-all, admin-write.
create table public.educational_content (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text not null,
  category text not null default 'basics' check (category in ('basics', 'strategies', 'markets', 'tools', 'glossary')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  summary text not null,
  content text,
  read_time numeric,
  icon text default 'BookOpen'
);
alter table public.educational_content enable row level security;
create policy "read" on public.educational_content for select using (auth.role() = 'authenticated');
create policy "admin write" on public.educational_content for insert with check (public.is_admin());
create policy "admin update" on public.educational_content for update using (public.is_admin());
create policy "admin delete" on public.educational_content for delete using (public.is_admin());
create trigger touch before update on public.educational_content for each row execute function public.touch_updated_date();

-- ExchangeRate — read-all, admin-write.
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  base text not null,
  quote text not null,
  rate numeric not null,
  source text not null default 'fallback' check (source in ('twelve_data', 'fallback', 'manual')),
  last_updated timestamptz
);
alter table public.exchange_rates enable row level security;
create policy "read" on public.exchange_rates for select using (auth.role() = 'authenticated');
create policy "admin write" on public.exchange_rates for insert with check (public.is_admin());
create policy "admin update" on public.exchange_rates for update using (public.is_admin());
create policy "admin delete" on public.exchange_rates for delete using (public.is_admin());
create trigger touch before update on public.exchange_rates for each row execute function public.touch_updated_date();

-- Goal — owner-only.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  name text not null check (char_length(name) <= 50),
  description text,
  icon text default 'Target',
  target_amount numeric not null check (target_amount >= 0),
  current_amount numeric not null default 0,
  target_date date,
  category text not null default 'wealth' check (category in ('retirement', 'education', 'home', 'emergency', 'wealth', 'other')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  color text default 'primary',
  linked_tickers text[],
  account_type text not null default 'demo' check (account_type in ('demo', 'real'))
);
alter table public.goals enable row level security;
create policy "owner read" on public.goals for select using (created_by_id = auth.uid());
create policy "owner insert" on public.goals for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.goals for update using (created_by_id = auth.uid());
create policy "owner delete" on public.goals for delete using (created_by_id = auth.uid());
create trigger touch before update on public.goals for each row execute function public.touch_updated_date();

-- GoalContribution — owner-only.
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  goal_id uuid,
  goal_name text,
  amount numeric not null check (amount >= 0),
  account_type text not null default 'demo' check (account_type in ('demo', 'real'))
);
alter table public.goal_contributions enable row level security;
create policy "owner read" on public.goal_contributions for select using (created_by_id = auth.uid());
create policy "owner insert" on public.goal_contributions for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.goal_contributions for update using (created_by_id = auth.uid());
create policy "owner delete" on public.goal_contributions for delete using (created_by_id = auth.uid());
create trigger touch before update on public.goal_contributions for each row execute function public.touch_updated_date();

-- Holding — owner-only.
create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  ticker text not null,
  name text not null,
  units numeric not null check (units >= 0),
  avg_cost numeric not null,
  avg_cost_bwp numeric,
  current_price numeric,
  currency text not null default 'BWP',
  sector text,
  investment_id uuid,
  account_type text not null default 'demo' check (account_type in ('demo', 'real'))
);
alter table public.holdings enable row level security;
create policy "owner read" on public.holdings for select using (created_by_id = auth.uid());
create policy "owner insert" on public.holdings for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.holdings for update using (created_by_id = auth.uid());
create policy "owner delete" on public.holdings for delete using (created_by_id = auth.uid());
create trigger touch before update on public.holdings for each row execute function public.touch_updated_date();

-- Investment — read-all, admin-write.
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  ticker text not null,
  name text not null,
  category text not null default 'equity' check (category in ('equity', 'etf', 'reit', 'bond', 'cash', 'digital')),
  market text not null default 'botswana' check (market in ('botswana', 'global')),
  sector text,
  exchange text not null default 'BSE' check (exchange in ('BSE', 'JSE', 'NYSE', 'NASDAQ', 'LSE', 'Crypto')),
  currency text not null default 'BWP',
  price numeric not null,
  previous_close numeric,
  daily_change numeric,
  daily_change_percent numeric,
  market_cap numeric,
  pe_ratio numeric,
  dividend_yield numeric,
  dividend_frequency text default 'none' check (dividend_frequency in ('none', 'quarterly', 'semi-annual', 'annual')),
  description text,
  logo_url text,
  historical_prices numeric[],
  featured boolean not null default false,
  data_source text not null default 'seeded' check (data_source in ('seeded', 'twelve_data', 'mansa')),
  last_updated timestamptz,
  is_demo boolean not null default true
);
alter table public.investments enable row level security;
create policy "read" on public.investments for select using (auth.role() = 'authenticated');
create policy "admin write" on public.investments for insert with check (public.is_admin());
create policy "admin update" on public.investments for update using (public.is_admin());
create policy "admin delete" on public.investments for delete using (public.is_admin());
create trigger touch before update on public.investments for each row execute function public.touch_updated_date();

-- MarketDataRequest — admin-only, all operations.
create table public.market_data_requests (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  provider text not null check (provider in ('mansa', 'twelve_data')),
  category text not null,
  status text not null default 'success' check (status in ('success', 'error')),
  http_status numeric,
  securities_updated numeric default 0,
  error_summary text
);
alter table public.market_data_requests enable row level security;
create policy "admin read" on public.market_data_requests for select using (public.is_admin());
create policy "admin write" on public.market_data_requests for insert with check (public.is_admin());
create policy "admin update" on public.market_data_requests for update using (public.is_admin());
create policy "admin delete" on public.market_data_requests for delete using (public.is_admin());
create trigger touch before update on public.market_data_requests for each row execute function public.touch_updated_date();

-- Notification — owner-only.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'trade', 'goal', 'dividend')),
  read boolean not null default false,
  icon text default 'Bell'
);
alter table public.notifications enable row level security;
create policy "owner read" on public.notifications for select using (created_by_id = auth.uid());
create policy "owner insert" on public.notifications for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.notifications for update using (created_by_id = auth.uid());
create policy "owner delete" on public.notifications for delete using (created_by_id = auth.uid());
create trigger touch before update on public.notifications for each row execute function public.touch_updated_date();

-- PortfolioSnapshot — owner-only.
create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  date date not null,
  total_value numeric not null,
  invested_value numeric,
  cash_value numeric,
  pl numeric,
  account_type text not null default 'demo' check (account_type in ('demo', 'real'))
);
alter table public.portfolio_snapshots enable row level security;
create policy "owner read" on public.portfolio_snapshots for select using (created_by_id = auth.uid());
create policy "owner insert" on public.portfolio_snapshots for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.portfolio_snapshots for update using (created_by_id = auth.uid());
create policy "owner delete" on public.portfolio_snapshots for delete using (created_by_id = auth.uid());
create trigger touch before update on public.portfolio_snapshots for each row execute function public.touch_updated_date();

-- Profile — owner-only.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  base_currency text default 'BWP',
  risk_tolerance text default 'moderate' check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
  experience_level text default 'beginner' check (experience_level in ('beginner', 'some', 'experienced')),
  primary_goal text default 'general' check (primary_goal in ('wealth', 'retirement', 'education', 'home', 'emergency', 'general', 'other')),
  onboarding_completed boolean not null default false,
  demo_mode boolean not null default true,
  country text default 'Botswana'
);
alter table public.profiles enable row level security;
create policy "owner read" on public.profiles for select using (created_by_id = auth.uid());
create policy "owner insert" on public.profiles for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.profiles for update using (created_by_id = auth.uid());
create policy "owner delete" on public.profiles for delete using (created_by_id = auth.uid());
create trigger touch before update on public.profiles for each row execute function public.touch_updated_date();

-- RecurringInvestment — owner-only.
create table public.recurring_investments (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  ticker text not null,
  name text not null,
  investment_id uuid,
  amount numeric not null check (amount >= 0),
  frequency text not null default 'monthly' check (frequency in ('weekly', 'bi-weekly', 'monthly')),
  next_date date,
  active boolean not null default true
);
alter table public.recurring_investments enable row level security;
create policy "owner read" on public.recurring_investments for select using (created_by_id = auth.uid());
create policy "owner insert" on public.recurring_investments for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.recurring_investments for update using (created_by_id = auth.uid());
create policy "owner delete" on public.recurring_investments for delete using (created_by_id = auth.uid());
create trigger touch before update on public.recurring_investments for each row execute function public.touch_updated_date();

-- Transaction — owner-only.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  type text not null default 'buy' check (type in ('buy', 'sell', 'deposit', 'withdrawal', 'dividend', 'fee', 'goal_contribution')),
  ticker text,
  name text,
  units numeric default 0,
  price numeric default 0,
  currency text default 'BWP',
  fx_rate numeric,
  fees numeric default 0,
  amount numeric not null,
  legacy boolean not null default false,
  status text not null default 'completed' check (status in ('completed', 'pending', 'failed')),
  description text,
  client_ref text,
  account_type text not null default 'demo' check (account_type in ('demo', 'real'))
);
alter table public.transactions enable row level security;
create policy "owner read" on public.transactions for select using (created_by_id = auth.uid());
create policy "owner insert" on public.transactions for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.transactions for update using (created_by_id = auth.uid());
create policy "owner delete" on public.transactions for delete using (created_by_id = auth.uid());
create trigger touch before update on public.transactions for each row execute function public.touch_updated_date();
create index transactions_client_ref_idx on public.transactions (client_ref);

-- Watchlist — owner-only.
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  ticker text not null,
  name text not null,
  category text,
  market text,
  price numeric,
  daily_change_percent numeric,
  investment_id uuid
);
alter table public.watchlists enable row level security;
create policy "owner read" on public.watchlists for select using (created_by_id = auth.uid());
create policy "owner insert" on public.watchlists for insert with check (created_by_id = auth.uid());
create policy "owner update" on public.watchlists for update using (created_by_id = auth.uid());
create policy "owner delete" on public.watchlists for delete using (created_by_id = auth.uid());
create trigger touch before update on public.watchlists for each row execute function public.touch_updated_date();
