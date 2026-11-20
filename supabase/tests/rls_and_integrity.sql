-- Database / RLS integrity checks for SureInvest.
-- npm run test:db  (requires DATABASE_URL or local supabase)

BEGIN;

DO $$
DECLARE
  v_count int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'cash_accounts_user_type_uidx'
  ) THEN
    RAISE EXCEPTION 'missing index cash_accounts_user_type_uidx';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'transactions_user_client_ref_uidx'
  ) THEN
    RAISE EXCEPTION 'missing index transactions_user_client_ref_uidx';
  END IF;

  IF to_regprocedure('public.execute_trade_atomic(uuid,text,uuid,numeric,text,text)') IS NULL THEN
    RAISE EXCEPTION 'missing function execute_trade_atomic';
  END IF;
  IF to_regprocedure('public.contribute_to_goal_atomic(uuid,uuid,numeric,text,text)') IS NULL THEN
    RAISE EXCEPTION 'missing function contribute_to_goal_atomic';
  END IF;
  IF to_regprocedure('public.execute_recurring_plan_atomic(uuid,date)') IS NULL THEN
    RAISE EXCEPTION 'missing function execute_recurring_plan_atomic';
  END IF;
  IF to_regprocedure('public.demo_cash_topup_atomic(uuid,numeric,text)') IS NULL THEN
    RAISE EXCEPTION 'missing function demo_cash_topup_atomic';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('cash_accounts', 'holdings', 'transactions', 'goals', 'goal_contributions', 'recurring_investments')
    AND cmd = 'INSERT'
    AND roles::text LIKE '%authenticated%';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'unexpected client INSERT policies on financial tables: %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.audit_duplicate_cash_accounts;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'duplicate cash accounts present: % groups', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.audit_duplicate_holdings;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'duplicate holdings present: % groups', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.investments
  WHERE market = 'global' AND data_source NOT IN ('seeded', 'twelve_data');
  IF v_count > 0 THEN
    RAISE EXCEPTION 'global investments with unexpected data_source: %', v_count;
  END IF;

  RAISE NOTICE 'rls_and_integrity: OK';
END $$;

ROLLBACK;
