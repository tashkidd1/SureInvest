-- Lock down client-side financial mutations.
-- Writes must go through Edge Functions using the service role (after auth +
-- ownership checks). Users retain SELECT on their own rows.

-- cash_accounts
drop policy if exists "owner insert" on public.cash_accounts;
drop policy if exists "owner update" on public.cash_accounts;
drop policy if exists "owner delete" on public.cash_accounts;

-- holdings
drop policy if exists "owner insert" on public.holdings;
drop policy if exists "owner update" on public.holdings;
drop policy if exists "owner delete" on public.holdings;

-- transactions
drop policy if exists "owner insert" on public.transactions;
drop policy if exists "owner update" on public.transactions;
drop policy if exists "owner delete" on public.transactions;

-- goal_contributions
drop policy if exists "owner insert" on public.goal_contributions;
drop policy if exists "owner update" on public.goal_contributions;
drop policy if exists "owner delete" on public.goal_contributions;

-- recurring_investments
drop policy if exists "owner insert" on public.recurring_investments;
drop policy if exists "owner update" on public.recurring_investments;
drop policy if exists "owner delete" on public.recurring_investments;

-- goals (create/delete via Edge Functions)
drop policy if exists "owner insert" on public.goals;
drop policy if exists "owner update" on public.goals;
drop policy if exists "owner delete" on public.goals;
