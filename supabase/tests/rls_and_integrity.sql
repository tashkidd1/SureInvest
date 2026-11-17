-- Database / RLS integrity checks for SureInvest.
-- Run against a local or CI database after migrations + seed:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_and_integrity.sql
-- or: supabase db execute --file supabase/tests/rls_and_integrity.sql

BEGIN;

DO $$
DECLARE
  v_count int;
BEGIN
  -- Unique cash account per user + account_type
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'cash_accounts_user_type_uidx'
  ) THEN
    RAISE EXCEPTION 'missing index cash_accounts_user_type_uidx';
  END IF;

  -- User-scoped client_ref uniqueness
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'transactions_user_client_ref_uidx'
  ) THEN
    RAISE EXCEPTION 'missing index transactions_user_client_ref_uidx';
  END IF;

  -- Atomic RPCs present
  IF to_regprocedure('public.execute_trade_atomic(uuid,text,uuid,numeric,text,text)') IS NULL THEN
    RAISE EXCEPTION 'missing function execute_trade_atomic';
  END IF;
  IF to_regprocedure('public.contribute_to_goal_atomic(uuid,uuid,numeric,text,text)') IS NULL THEN
    RAISE EXCEPTION 'missing function contribute_to_goal_atomic';
  END IF;
  IF to_regprocedure('public.execute_recurring_plan_atomic(uuid,date)') IS NULL THEN
    RAISE EXCEPTION 'missing function execute_recurring_plan_atomic';
  END IF;

  -- Financial tables: no client INSERT policies (service-role only writes)
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('cash_accounts', 'holdings', 'transactions', 'goals', 'goal_contributions', 'recurring_investments')
    AND cmd = 'INSERT'
    AND roles::text LIKE '%authenticated%';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'unexpected client INSERT policies on financial tables: %', v_count;
  END IF;

  -- Seed provenance: global rows should be seeded (or twelve_data after refresh)
  SELECT count(*) INTO v_count
  FROM public.investments
  WHERE market = 'global' AND data_source NOT IN ('seeded', 'twelve_data');
  IF v_count > 0 THEN
    RAISE EXCEPTION 'global investments with unexpected data_source: %', v_count;
  END IF;

  RAISE NOTICE 'rls_and_integrity: OK';
END $$;

ROLLBACK;
