-- Phase 1: financial integrity follow-ups
-- - Atomic demo cash top-up
-- - Holdings dedupe safety (keep oldest per user/type/investment)
-- - Audit view for residual duplicates (should be empty after unique indexes)

-- ---------------------------------------------------------------------------
-- Dedupe holdings that predate the unique index (same investment, user, type).
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY created_by_id, COALESCE(account_type, 'demo'), investment_id
           ORDER BY created_date ASC NULLS LAST, id ASC
         ) AS rn,
         SUM(units) OVER (
           PARTITION BY created_by_id, COALESCE(account_type, 'demo'), investment_id
         ) AS total_units,
         SUM(units * avg_cost) OVER (
           PARTITION BY created_by_id, COALESCE(account_type, 'demo'), investment_id
         ) / NULLIF(SUM(units) OVER (
           PARTITION BY created_by_id, COALESCE(account_type, 'demo'), investment_id
         ), 0) AS weighted_avg_cost,
         CASE WHEN COUNT(*) FILTER (WHERE avg_cost_bwp IS NULL) OVER (
           PARTITION BY created_by_id, COALESCE(account_type, 'demo'), investment_id
         ) = 0 THEN
           SUM(units * avg_cost_bwp) OVER (
             PARTITION BY created_by_id, COALESCE(account_type, 'demo'), investment_id
           ) / NULLIF(SUM(units) OVER (
             PARTITION BY created_by_id, COALESCE(account_type, 'demo'), investment_id
           ), 0)
         ELSE NULL END AS weighted_avg_cost_bwp
  FROM public.holdings
  WHERE investment_id IS NOT NULL AND created_by_id IS NOT NULL
),
keeper AS (
  SELECT id, total_units, weighted_avg_cost, weighted_avg_cost_bwp
  FROM ranked WHERE rn = 1
)
UPDATE public.holdings h
SET units = k.total_units,
    avg_cost = COALESCE(k.weighted_avg_cost, h.avg_cost),
    avg_cost_bwp = k.weighted_avg_cost_bwp,
    updated_date = now()
FROM keeper k
WHERE h.id = k.id;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY created_by_id, COALESCE(account_type, 'demo'), investment_id
           ORDER BY created_date ASC NULLS LAST, id ASC
         ) AS rn
  FROM public.holdings
  WHERE investment_id IS NOT NULL AND created_by_id IS NOT NULL
)
DELETE FROM public.holdings h
USING ranked r
WHERE h.id = r.id AND r.rn > 1;

-- Ensure unique indexes exist (idempotent if 20261117163000 already applied)
CREATE UNIQUE INDEX IF NOT EXISTS cash_accounts_user_type_uidx
  ON public.cash_accounts (created_by_id, account_type);

CREATE UNIQUE INDEX IF NOT EXISTS holdings_user_type_investment_uidx
  ON public.holdings (created_by_id, account_type, investment_id)
  WHERE investment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_client_ref_uidx
  ON public.transactions (created_by_id, client_ref)
  WHERE client_ref IS NOT NULL AND client_ref <> '';

-- ---------------------------------------------------------------------------
-- Atomic demo cash top-up (fixed amount, row lock, optional client_ref)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.demo_cash_topup_atomic(
  p_user_id uuid,
  p_amount numeric DEFAULT 5000,
  p_client_ref text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash public.cash_accounts%ROWTYPE;
  v_existing public.transactions%ROWTYPE;
  v_amount numeric;
  v_new_balance numeric;
  v_ref text;
BEGIN
  v_amount := COALESCE(p_amount, 5000);
  IF v_amount <= 0 OR v_amount > 50000 THEN
    RETURN jsonb_build_object('error', 'Invalid top-up amount.', 'status', 400);
  END IF;

  v_ref := NULLIF(trim(COALESCE(p_client_ref, '')), '');
  IF v_ref IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.transactions
    WHERE created_by_id = p_user_id AND client_ref = v_ref
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'amount', v_existing.amount,
        'balance', NULL,
        'message', 'This top-up was already processed.'
      );
    END IF;
  END IF;

  SELECT * INTO v_cash
  FROM public.cash_accounts
  WHERE created_by_id = p_user_id AND account_type = 'demo'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Demo cash account not found.', 'status', 404);
  END IF;

  v_new_balance := COALESCE(v_cash.balance, 0) + v_amount;
  UPDATE public.cash_accounts
  SET balance = v_new_balance, available = v_new_balance, updated_date = now()
  WHERE id = v_cash.id;

  INSERT INTO public.transactions (
    created_by_id, type, amount, currency, fx_rate, fees, status,
    description, account_type, client_ref
  ) VALUES (
    p_user_id, 'deposit', v_amount, 'BWP', 1, 0, 'completed',
    'Demo top-up', 'demo', v_ref
  );

  INSERT INTO public.notifications (created_by_id, title, body, type, icon)
  VALUES (
    p_user_id,
    'Cash topped up',
    format('P%s demo cash added to your account.', to_char(v_amount, 'FM999,999,990')),
    'success',
    'Wallet'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'amount', v_amount,
    'balance', v_new_balance,
    'duplicate', false
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.transactions
    WHERE created_by_id = p_user_id AND client_ref = v_ref
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true, 'duplicate', true, 'amount', v_existing.amount,
        'message', 'This top-up was already processed.'
      );
    END IF;
    RETURN jsonb_build_object('error', 'Concurrent conflict. Please retry.', 'status', 409);
END;
$$;

REVOKE ALL ON FUNCTION public.demo_cash_topup_atomic(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_cash_topup_atomic(uuid, numeric, text) TO service_role;

-- Diagnostic view: residual duplicates (should return 0 rows in healthy DB)
CREATE OR REPLACE VIEW public.audit_duplicate_cash_accounts AS
SELECT created_by_id, account_type, count(*) AS n
FROM public.cash_accounts
GROUP BY 1, 2
HAVING count(*) > 1;

CREATE OR REPLACE VIEW public.audit_duplicate_holdings AS
SELECT created_by_id, account_type, investment_id, count(*) AS n
FROM public.holdings
WHERE investment_id IS NOT NULL
GROUP BY 1, 2, 3
HAVING count(*) > 1;
