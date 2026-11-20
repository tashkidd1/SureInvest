-- P0/P1 data integrity + atomic financial mutation helpers
-- 1) Unique cash account per user + account_type
-- 2) Idempotency scoped by user (created_by_id, client_ref)
-- 3) Atomic RPCs for trade / goal contribution / auto-invest with row locks

-- ---------------------------------------------------------------------------
-- Deduplicate cash_accounts before unique index (keep oldest row per key).
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY created_by_id, COALESCE(account_type, 'demo')
           ORDER BY created_date ASC NULLS LAST, id ASC
         ) AS rn
  FROM public.cash_accounts
  WHERE created_by_id IS NOT NULL
)
DELETE FROM public.cash_accounts c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS cash_accounts_user_type_uidx
  ON public.cash_accounts (created_by_id, account_type);

-- ---------------------------------------------------------------------------
-- Scope client_ref uniqueness to the owning user. Global uniqueness would
-- allow one user's ref to block another user's legitimate retry.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS transactions_client_ref_idx;

-- Drop any prior global unique if present (none in base schema, defensive).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_client_ref_key'
  ) THEN
    ALTER TABLE public.transactions DROP CONSTRAINT transactions_client_ref_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_client_ref_uidx
  ON public.transactions (created_by_id, client_ref)
  WHERE client_ref IS NOT NULL AND client_ref <> '';

CREATE INDEX IF NOT EXISTS transactions_client_ref_idx
  ON public.transactions (client_ref)
  WHERE client_ref IS NOT NULL;

-- Consolidate duplicate holdings before creating the unique index.
-- Preserve total units and weighted native-currency cost basis. BWP basis is
-- retained only when every source row has one; otherwise NULL avoids a false P/L.
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
keepers AS (
  SELECT id,total_units,weighted_avg_cost,weighted_avg_cost_bwp
  FROM ranked WHERE rn=1
)
UPDATE public.holdings h
SET units=k.total_units,
    avg_cost=COALESCE(k.weighted_avg_cost,h.avg_cost),
    avg_cost_bwp=k.weighted_avg_cost_bwp,
    updated_date=now()
FROM keepers k WHERE h.id=k.id;

WITH ranked AS (
  SELECT id,ROW_NUMBER() OVER (
    PARTITION BY created_by_id,COALESCE(account_type,'demo'),investment_id
    ORDER BY created_date ASC NULLS LAST,id ASC
  ) AS rn
  FROM public.holdings
  WHERE investment_id IS NOT NULL AND created_by_id IS NOT NULL
)
DELETE FROM public.holdings h USING ranked r
WHERE h.id=r.id AND r.rn>1;

-- Optional: one holding row per user/account/investment (helps consolidations).
CREATE UNIQUE INDEX IF NOT EXISTS holdings_user_type_investment_uidx
  ON public.holdings (created_by_id, account_type, investment_id)
  WHERE investment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Atomic trade (buy/sell). Locks cash row; uses unique client_ref for idempotency.
-- Returns jsonb payload matching Edge Function response shape.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_trade_atomic(
  p_user_id uuid,
  p_action text,
  p_investment_id uuid,
  p_units numeric,
  p_account_type text,
  p_client_ref text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.investments%ROWTYPE;
  v_cash public.cash_accounts%ROWTYPE;
  v_holding public.holdings%ROWTYPE;
  v_price numeric;
  v_currency text;
  v_fx numeric;
  v_native_total numeric;
  v_bwp_total numeric;
  v_bwp_unit numeric;
  v_new_balance numeric;
  v_existing_tx public.transactions%ROWTYPE;
  v_new_units numeric;
  v_new_avg numeric;
  v_new_avg_bwp numeric;
  v_prev_avg_bwp numeric;
BEGIN
  IF p_action NOT IN ('buy', 'sell') THEN
    RETURN jsonb_build_object('error', 'Invalid action.', 'status', 400);
  END IF;
  IF p_units IS NULL OR p_units <= 0 THEN
    RETURN jsonb_build_object('error', 'Enter a valid number of units.', 'status', 400);
  END IF;
  IF COALESCE(p_account_type, 'demo') = 'real' THEN
    RETURN jsonb_build_object('error', 'Real account trading is not yet enabled.', 'status', 400);
  END IF;
  p_account_type := COALESCE(p_account_type, 'demo');

  -- Idempotency (scoped by user)
  IF p_client_ref IS NOT NULL AND length(trim(p_client_ref)) > 0 THEN
    SELECT * INTO v_existing_tx
    FROM public.transactions
    WHERE created_by_id = p_user_id AND client_ref = p_client_ref
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'action', v_existing_tx.type,
        'units', v_existing_tx.units,
        'price', v_existing_tx.price,
        'total', abs(v_existing_tx.amount),
        'message', 'This order was already processed.'
      );
    END IF;
  END IF;

  SELECT * INTO v_inv FROM public.investments WHERE id = p_investment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Investment not found.', 'status', 404);
  END IF;
  v_price := COALESCE(v_inv.price, 0);
  IF v_price <= 0 THEN
    RETURN jsonb_build_object('error', 'No price available for this investment.', 'status', 400);
  END IF;
  v_currency := COALESCE(v_inv.currency, 'BWP');

  IF v_currency = 'BWP' THEN
    v_fx := 1;
  ELSE
    SELECT rate INTO v_fx
    FROM public.exchange_rates
    WHERE base = 'USD' AND quote = 'BWP'
    ORDER BY last_updated DESC NULLS LAST, created_date DESC
    LIMIT 1;
    v_fx := COALESCE(NULLIF(v_fx, 0), 13.5);
  END IF;

  v_native_total := v_price * p_units;
  v_bwp_total := CASE WHEN v_currency = 'BWP' THEN v_native_total ELSE v_native_total * v_fx END;
  v_bwp_unit := CASE WHEN v_currency = 'BWP' THEN v_price ELSE v_price * v_fx END;

  -- Lock cash row for concurrency safety
  SELECT * INTO v_cash
  FROM public.cash_accounts
  WHERE created_by_id = p_user_id AND account_type = p_account_type
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No cash account found. Please complete onboarding first.', 'status', 400);
  END IF;

  -- Preferred holding by investment_id
  SELECT * INTO v_holding
  FROM public.holdings
  WHERE created_by_id = p_user_id
    AND account_type = p_account_type
    AND investment_id = v_inv.id
  FOR UPDATE;

  IF p_action = 'buy' THEN
    IF v_cash.balance < v_bwp_total THEN
      RETURN jsonb_build_object('error', 'Insufficient cash for this purchase.', 'status', 400);
    END IF;
    v_new_balance := v_cash.balance - v_bwp_total;
    UPDATE public.cash_accounts
    SET balance = v_new_balance, available = v_new_balance, updated_date = now()
    WHERE id = v_cash.id;

    IF FOUND AND v_holding.id IS NOT NULL THEN
      v_prev_avg_bwp := COALESCE(NULLIF(v_holding.avg_cost_bwp, 0),
        CASE WHEN COALESCE(v_holding.currency, v_currency) = 'BWP'
             THEN v_holding.avg_cost ELSE v_holding.avg_cost * v_fx END);
      v_new_units := COALESCE(v_holding.units, 0) + p_units;
      v_new_avg := (COALESCE(v_holding.units, 0) * COALESCE(v_holding.avg_cost, 0) + p_units * v_price) / v_new_units;
      v_new_avg_bwp := (COALESCE(v_holding.units, 0) * v_prev_avg_bwp + p_units * v_bwp_unit) / v_new_units;
      UPDATE public.holdings SET
        units = v_new_units,
        avg_cost = v_new_avg,
        avg_cost_bwp = v_new_avg_bwp,
        current_price = v_price,
        currency = v_currency,
        investment_id = v_inv.id,
        updated_date = now()
      WHERE id = v_holding.id;
    ELSE
      INSERT INTO public.holdings (
        created_by_id, ticker, name, units, avg_cost, avg_cost_bwp,
        current_price, currency, sector, investment_id, account_type
      ) VALUES (
        p_user_id, v_inv.ticker, v_inv.name, p_units, v_price, v_bwp_unit,
        v_price, v_currency, v_inv.sector, v_inv.id, p_account_type
      );
    END IF;

    INSERT INTO public.transactions (
      created_by_id, type, ticker, name, units, price, currency, fx_rate, fees,
      amount, status, description, client_ref, account_type
    ) VALUES (
      p_user_id, 'buy', v_inv.ticker, v_inv.name, p_units, v_price, v_currency, v_fx, 0,
      -v_bwp_total, 'completed',
      format('Bought %s %s @ %s %s (≈P%s)', p_units, v_inv.ticker, v_price, v_currency, round(v_bwp_total, 2)),
      NULLIF(trim(COALESCE(p_client_ref, '')), ''),
      p_account_type
    );

    INSERT INTO public.notifications (created_by_id, title, body, type)
    VALUES (
      p_user_id,
      'Purchase completed',
      format('You bought %s %s for %s %s (≈P%s).', p_units, v_inv.ticker, v_currency, round(v_native_total, 2), round(v_bwp_total, 2)),
      'trade'
    );

    RETURN jsonb_build_object(
      'ok', true, 'action', 'buy', 'units', p_units, 'price', v_price,
      'currency', v_currency, 'fx_rate', v_fx, 'native_total', v_native_total,
      'total', v_bwp_total, 'cash_balance', v_new_balance
    );
  END IF;

  -- SELL
  IF v_holding.id IS NULL OR COALESCE(v_holding.units, 0) < p_units THEN
    RETURN jsonb_build_object('error', 'You do not own enough units to sell.', 'status', 400);
  END IF;

  v_new_balance := v_cash.balance + v_bwp_total;
  UPDATE public.cash_accounts
  SET balance = v_new_balance, available = v_new_balance, updated_date = now()
  WHERE id = v_cash.id;

  IF (v_holding.units - p_units) > 0 THEN
    UPDATE public.holdings
    SET units = v_holding.units - p_units, current_price = v_price, updated_date = now()
    WHERE id = v_holding.id;
  ELSE
    DELETE FROM public.holdings WHERE id = v_holding.id;
  END IF;

  INSERT INTO public.transactions (
    created_by_id, type, ticker, name, units, price, currency, fx_rate, fees,
    amount, status, description, client_ref, account_type
  ) VALUES (
    p_user_id, 'sell', v_inv.ticker, v_inv.name, p_units, v_price, v_currency, v_fx, 0,
    v_bwp_total, 'completed',
    format('Sold %s %s @ %s %s (≈P%s)', p_units, v_inv.ticker, v_price, v_currency, round(v_bwp_total, 2)),
    NULLIF(trim(COALESCE(p_client_ref, '')), ''),
    p_account_type
  );

  INSERT INTO public.notifications (created_by_id, title, body, type)
  VALUES (
    p_user_id,
    'Sale completed',
    format('You sold %s %s for %s %s (≈P%s).', p_units, v_inv.ticker, v_currency, round(v_native_total, 2), round(v_bwp_total, 2)),
    'trade'
  );

  RETURN jsonb_build_object(
    'ok', true, 'action', 'sell', 'units', p_units, 'price', v_price,
    'currency', v_currency, 'fx_rate', v_fx, 'native_total', v_native_total,
    'total', v_bwp_total, 'cash_balance', v_new_balance
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent duplicate client_ref
    SELECT * INTO v_existing_tx
    FROM public.transactions
    WHERE created_by_id = p_user_id AND client_ref = p_client_ref
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true, 'duplicate', true, 'action', v_existing_tx.type,
        'units', v_existing_tx.units, 'price', v_existing_tx.price,
        'total', abs(v_existing_tx.amount),
        'message', 'This order was already processed.'
      );
    END IF;
    RETURN jsonb_build_object('error', 'Concurrent conflict. Please retry.', 'status', 409);
END;
$$;

REVOKE ALL ON FUNCTION public.execute_trade_atomic(uuid, text, uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_trade_atomic(uuid, text, uuid, numeric, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic goal contribution
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contribute_to_goal_atomic(
  p_user_id uuid,
  p_goal_id uuid,
  p_amount numeric,
  p_account_type text,
  p_client_ref text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash public.cash_accounts%ROWTYPE;
  v_goal public.goals%ROWTYPE;
  v_existing_tx public.transactions%ROWTYPE;
  v_target numeric;
  v_current numeric;
  v_remaining numeric;
  v_new_balance numeric;
  v_new_current numeric;
  v_completed boolean;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Enter a valid amount.', 'status', 400);
  END IF;
  IF COALESCE(p_account_type, 'demo') = 'real' THEN
    RETURN jsonb_build_object('error', 'Goals are not yet available for the Real Account.', 'status', 400);
  END IF;
  p_account_type := COALESCE(p_account_type, 'demo');

  IF p_client_ref IS NOT NULL AND length(trim(p_client_ref)) > 0 THEN
    SELECT * INTO v_existing_tx
    FROM public.transactions
    WHERE created_by_id = p_user_id AND client_ref = p_client_ref
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true, 'message', 'This contribution was already processed.');
    END IF;
  END IF;

  SELECT * INTO v_cash
  FROM public.cash_accounts
  WHERE created_by_id = p_user_id AND account_type = p_account_type
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No cash account found. Please complete onboarding first.', 'status', 400);
  END IF;

  SELECT * INTO v_goal
  FROM public.goals
  WHERE id = p_goal_id AND created_by_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_goal.account_type, 'demo') <> p_account_type THEN
    RETURN jsonb_build_object('error', 'Goal not found.', 'status', 404);
  END IF;

  v_target := COALESCE(v_goal.target_amount, 0);
  v_current := COALESCE(v_goal.current_amount, 0);
  v_remaining := v_target - v_current;

  IF v_current >= v_target THEN
    RETURN jsonb_build_object(
      'error', 'This goal has already been completed.',
      'completed', true, 'remaining', 0, 'target', v_target, 'current', v_current,
      'status', 400
    );
  END IF;
  IF p_amount > v_remaining THEN
    RETURN jsonb_build_object(
      'error', format('Only P%s is needed to complete this goal.', round(v_remaining, 2)),
      'over', true, 'remaining', v_remaining, 'requested', p_amount,
      'target', v_target, 'current', v_current, 'status', 400
    );
  END IF;
  IF v_cash.balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Insufficient cash for this contribution.', 'status', 400);
  END IF;

  v_new_balance := v_cash.balance - p_amount;
  v_new_current := v_current + p_amount;
  v_completed := v_new_current >= v_target;

  UPDATE public.cash_accounts
  SET balance = v_new_balance, available = v_new_balance, updated_date = now()
  WHERE id = v_cash.id;

  UPDATE public.goals
  SET current_amount = v_new_current,
      status = CASE WHEN v_completed THEN 'completed' ELSE 'active' END,
      updated_date = now()
  WHERE id = v_goal.id;

  INSERT INTO public.goal_contributions (created_by_id, goal_id, goal_name, amount, account_type)
  VALUES (p_user_id, p_goal_id, v_goal.name, p_amount, p_account_type);

  INSERT INTO public.transactions (
    created_by_id, type, amount, currency, fx_rate, fees, status, description, client_ref, account_type
  ) VALUES (
    p_user_id, 'goal_contribution', -p_amount, 'BWP', 1, 0, 'completed',
    format('Contribution to %s', v_goal.name),
    NULLIF(trim(COALESCE(p_client_ref, '')), ''),
    p_account_type
  );

  INSERT INTO public.notifications (created_by_id, title, body, type)
  VALUES (
    p_user_id,
    CASE WHEN v_completed THEN format('Goal completed: %s', v_goal.name) ELSE 'Goal contribution' END,
    CASE WHEN v_completed
      THEN format('Your goal "%s" has reached its target of P%s.', v_goal.name, round(v_target, 2))
      ELSE format('P%s added to "%s".', round(p_amount, 2), v_goal.name)
    END,
    'goal'
  );

  RETURN jsonb_build_object(
    'ok', true, 'amount', p_amount, 'cash_balance', v_new_balance,
    'goal_current', v_new_current, 'goal_target', v_target,
    'completed', v_completed, 'remaining', v_target - v_new_current
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing_tx
    FROM public.transactions
    WHERE created_by_id = p_user_id AND client_ref = p_client_ref
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true, 'message', 'This contribution was already processed.');
    END IF;
    RETURN jsonb_build_object('error', 'Concurrent conflict. Please retry.', 'status', 409);
END;
$$;

REVOKE ALL ON FUNCTION public.contribute_to_goal_atomic(uuid, uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contribute_to_goal_atomic(uuid, uuid, numeric, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic Auto-Invest execution for a single plan (called from Edge Function loop).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_recurring_plan_atomic(
  p_plan_id uuid,
  p_cycle_date date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.recurring_investments%ROWTYPE;
  v_inv public.investments%ROWTYPE;
  v_cash public.cash_accounts%ROWTYPE;
  v_holding public.holdings%ROWTYPE;
  v_client_ref text;
  v_amount numeric;
  v_price numeric;
  v_fx numeric;
  v_price_bwp numeric;
  v_units numeric;
  v_new_balance numeric;
  v_new_units numeric;
  v_new_avg numeric;
  v_new_avg_bwp numeric;
  v_next date;
BEGIN
  SELECT * INTO v_plan FROM public.recurring_investments WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND OR NOT v_plan.active THEN
    RETURN jsonb_build_object('status', 'skip', 'reason', 'inactive_or_missing');
  END IF;

  v_client_ref := format('autoinvest-%s-%s', v_plan.id, p_cycle_date);

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE created_by_id = v_plan.created_by_id AND client_ref = v_client_ref
  ) THEN
    RETURN jsonb_build_object('status', 'duplicate', 'client_ref', v_client_ref);
  END IF;

  SELECT * INTO v_inv FROM public.investments WHERE id = v_plan.investment_id;
  IF NOT FOUND OR COALESCE(v_inv.price, 0) <= 0 THEN
    RETURN jsonb_build_object('status', 'failed', 'reason', 'no_price');
  END IF;

  v_amount := COALESCE(v_plan.amount, 0);
  SELECT * INTO v_cash
  FROM public.cash_accounts
  WHERE created_by_id = v_plan.created_by_id AND account_type = 'demo'
  FOR UPDATE;

  IF v_cash.id IS NULL OR v_cash.balance < v_amount THEN
    -- Advance schedule even on insufficient funds (matches prior behaviour)
    IF v_plan.frequency = 'weekly' THEN
      v_next := (COALESCE(v_plan.next_date, p_cycle_date) + INTERVAL '7 days')::date;
    ELSIF v_plan.frequency = 'bi-weekly' THEN
      v_next := (COALESCE(v_plan.next_date, p_cycle_date) + INTERVAL '14 days')::date;
    ELSE
      v_next := (COALESCE(v_plan.next_date, p_cycle_date) + INTERVAL '1 month')::date;
    END IF;
    UPDATE public.recurring_investments SET next_date = v_next, updated_date = now() WHERE id = v_plan.id;
    INSERT INTO public.notifications (created_by_id, title, body, type)
    VALUES (
      v_plan.created_by_id,
      'Auto-Invest skipped',
      format('Not enough cash for the P%s auto-invest into %s this cycle.', round(v_amount, 2), v_plan.ticker),
      'warning'
    );
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'insufficient_funds', 'next_date', v_next);
  END IF;

  v_price := v_inv.price;
  IF COALESCE(v_inv.currency, 'BWP') = 'BWP' THEN
    v_fx := 1;
    v_price_bwp := v_price;
  ELSE
    SELECT rate INTO v_fx FROM public.exchange_rates
    WHERE base = 'USD' AND quote = 'BWP'
    ORDER BY last_updated DESC NULLS LAST, created_date DESC LIMIT 1;
    v_fx := COALESCE(NULLIF(v_fx, 0), 13.5);
    v_price_bwp := v_price * v_fx;
  END IF;

  IF v_price_bwp <= 0 THEN
    RETURN jsonb_build_object('status', 'failed', 'reason', 'bad_fx');
  END IF;
  v_units := v_amount / v_price_bwp;
  IF v_units <= 0 THEN
    RETURN jsonb_build_object('status', 'failed', 'reason', 'zero_units');
  END IF;

  v_new_balance := v_cash.balance - v_amount;
  UPDATE public.cash_accounts
  SET balance = v_new_balance, available = v_new_balance, updated_date = now()
  WHERE id = v_cash.id;

  SELECT * INTO v_holding
  FROM public.holdings
  WHERE created_by_id = v_plan.created_by_id
    AND account_type = 'demo'
    AND investment_id = v_inv.id
  FOR UPDATE;

  IF v_holding.id IS NOT NULL THEN
    v_new_units := v_holding.units + v_units;
    v_new_avg := (v_holding.units * v_holding.avg_cost + v_units * v_price) / v_new_units;
    v_new_avg_bwp := (v_holding.units * COALESCE(NULLIF(v_holding.avg_cost_bwp, 0), v_price_bwp) + v_units * v_price_bwp) / v_new_units;
    UPDATE public.holdings SET
      units = v_new_units, avg_cost = v_new_avg, avg_cost_bwp = v_new_avg_bwp,
      current_price = v_price, currency = v_inv.currency, updated_date = now()
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO public.holdings (
      created_by_id, ticker, name, investment_id, units, avg_cost, avg_cost_bwp,
      current_price, currency, sector, account_type
    ) VALUES (
      v_plan.created_by_id, v_inv.ticker, v_inv.name, v_inv.id, v_units, v_price, v_price_bwp,
      v_price, v_inv.currency, v_inv.sector, 'demo'
    );
  END IF;

  INSERT INTO public.transactions (
    created_by_id, type, ticker, name, units, price, currency, fx_rate, fees,
    amount, status, description, account_type, client_ref
  ) VALUES (
    v_plan.created_by_id, 'buy', v_inv.ticker, v_inv.name, v_units, v_price, v_inv.currency, v_fx, 0,
    -v_amount, 'completed', format('Auto-Invest: %s', v_plan.ticker), 'demo', v_client_ref
  );

  IF v_plan.frequency = 'weekly' THEN
    v_next := (COALESCE(v_plan.next_date, p_cycle_date) + INTERVAL '7 days')::date;
  ELSIF v_plan.frequency = 'bi-weekly' THEN
    v_next := (COALESCE(v_plan.next_date, p_cycle_date) + INTERVAL '14 days')::date;
  ELSE
    v_next := (COALESCE(v_plan.next_date, p_cycle_date) + INTERVAL '1 month')::date;
  END IF;
  UPDATE public.recurring_investments SET next_date = v_next, updated_date = now() WHERE id = v_plan.id;

  INSERT INTO public.notifications (created_by_id, title, body, type)
  VALUES (
    v_plan.created_by_id,
    'Auto-Invest executed',
    format('P%s invested into %s.', round(v_amount, 2), v_plan.ticker),
    'trade'
  );

  RETURN jsonb_build_object(
    'status', 'executed', 'amount', v_amount, 'units', v_units,
    'ticker', v_plan.ticker, 'next_date', v_next, 'user_id', v_plan.created_by_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'duplicate', 'client_ref', v_client_ref);
END;
$$;

REVOKE ALL ON FUNCTION public.execute_recurring_plan_atomic(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_recurring_plan_atomic(uuid, date) TO service_role;

-- ---------------------------------------------------------------------------
-- Correct seeded market-data provenance for global catalogue rows.
-- ---------------------------------------------------------------------------
UPDATE public.investments
SET data_source = 'seeded'
WHERE market = 'global'
  AND (data_source IS NULL OR data_source = 'seeded');
