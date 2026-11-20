-- Behavioural financial/RLS regression tests. Run only against a disposable local DB.
-- All fixtures are rolled back. Requires the migrations and Supabase auth schema.
BEGIN;

CREATE TEMP TABLE _sureinvest_test_ids(user_a uuid,user_b uuid,investment_id uuid,plan_id uuid) ON COMMIT DROP;
INSERT INTO _sureinvest_test_ids VALUES (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT user_a,'authenticated','authenticated',user_a::text||'@sureinvest.test','',now(),'{}'::jsonb,'{}'::jsonb,now(),now()
FROM _sureinvest_test_ids
UNION ALL
SELECT user_b,'authenticated','authenticated',user_b::text||'@sureinvest.test','',now(),'{}'::jsonb,'{}'::jsonb,now(),now()
FROM _sureinvest_test_ids;

INSERT INTO public.investments(id,ticker,name,category,market,exchange,currency,price,data_source)
SELECT investment_id,'SITEST','SureInvest SQL Test','equity','global','NASDAQ','BWP',10,'seeded'
FROM _sureinvest_test_ids;

INSERT INTO public.cash_accounts(created_by_id,balance,available,currency,account_type)
SELECT user_a,1000,1000,'BWP','demo' FROM _sureinvest_test_ids
UNION ALL
SELECT user_b,1000,1000,'BWP','demo' FROM _sureinvest_test_ids;

-- Top-up: exactly one ledger entry and one balance increment for repeated client_ref.
DO $$
DECLARE u uuid; before_balance numeric; first_result jsonb; second_result jsonb; after_balance numeric; tx_count integer;
BEGIN
 SELECT user_a INTO u FROM _sureinvest_test_ids;
 SELECT balance INTO before_balance FROM public.cash_accounts WHERE created_by_id=u AND account_type='demo';
 first_result := public.demo_cash_topup_atomic(u,5000,'test-topup-idempotency');
 second_result := public.demo_cash_topup_atomic(u,5000,'test-topup-idempotency');
 SELECT balance INTO after_balance FROM public.cash_accounts WHERE created_by_id=u AND account_type='demo';
 SELECT count(*) INTO tx_count FROM public.transactions WHERE created_by_id=u AND client_ref='test-topup-idempotency';
 IF first_result->>'ok' <> 'true' OR second_result->>'duplicate' <> 'true' THEN
   RAISE EXCEPTION 'top-up RPC/idempotency failed: %, %',first_result,second_result;
 END IF;
 IF after_balance <> before_balance + 5000 OR tx_count <> 1 THEN
   RAISE EXCEPTION 'top-up applied more than once: balance %, ledger rows %',after_balance,tx_count;
 END IF;
END $$;

-- Trade: verifies cash/holding/ledger mutation and idempotent replay.
DO $$
DECLARE u uuid; inv uuid; before_balance numeric; first_result jsonb; second_result jsonb; after_balance numeric; units numeric; tx_count integer;
BEGIN
 SELECT user_a,investment_id INTO u,inv FROM _sureinvest_test_ids;
 SELECT balance INTO before_balance FROM public.cash_accounts WHERE created_by_id=u AND account_type='demo';
 first_result := public.execute_trade_atomic(u,'buy',inv,2,'demo','test-trade-idempotency');
 second_result := public.execute_trade_atomic(u,'buy',inv,2,'demo','test-trade-idempotency');
 SELECT balance INTO after_balance FROM public.cash_accounts WHERE created_by_id=u AND account_type='demo';
 SELECT sum(units) INTO units FROM public.holdings WHERE created_by_id=u AND investment_id=inv AND account_type='demo';
 SELECT count(*) INTO tx_count FROM public.transactions WHERE created_by_id=u AND client_ref='test-trade-idempotency';
 IF first_result->>'ok' <> 'true' OR second_result->>'duplicate' <> 'true' THEN
   RAISE EXCEPTION 'trade RPC/idempotency failed: %, %',first_result,second_result;
 END IF;
 IF after_balance <> before_balance - 20 OR units <> 2 OR tx_count <> 1 THEN
   RAISE EXCEPTION 'trade side effects incorrect: balance %, units %, ledger %',after_balance,units,tx_count;
 END IF;
END $$;

-- Recurring plan: executes once for a cycle, updates schedule, and rejects replay.
DO $$
DECLARE u uuid; inv uuid; plan uuid; first_result jsonb; second_result jsonb; tx_count integer;
BEGIN
 SELECT user_a,investment_id,plan_id INTO u,inv,plan FROM _sureinvest_test_ids;
 INSERT INTO public.recurring_investments(id,created_by_id,ticker,name,investment_id,amount,frequency,next_date,active)
 VALUES(plan,u,'SITEST','SureInvest SQL Test',inv,50,'weekly',current_date,true);
 first_result := public.execute_recurring_plan_atomic(plan,current_date);
 second_result := public.execute_recurring_plan_atomic(plan,current_date);
 SELECT count(*) INTO tx_count FROM public.transactions
 WHERE created_by_id=u AND client_ref=format('autoinvest-%s-%s',plan,current_date);
 IF first_result->>'status' <> 'executed' OR second_result->>'status' <> 'duplicate' OR tx_count <> 1 THEN
   RAISE EXCEPTION 'recurring investment execution/idempotency failed: %, %, tx=%',first_result,second_result,tx_count;
 END IF;
 IF (SELECT next_date FROM public.recurring_investments WHERE id=plan) <= current_date THEN
   RAISE EXCEPTION 'recurring investment schedule was not advanced';
 END IF;
END $$;


-- Shared market-data lock and atomic daily credit reservations.
DO $
DECLARE token_a uuid:=gen_random_uuid(); token_b uuid:=gen_random_uuid(); acquired boolean; released boolean; reservation jsonb;
BEGIN
 acquired := public.acquire_market_data_refresh_lock('test-market-refresh',token_a,120);
 IF acquired IS DISTINCT FROM true THEN RAISE EXCEPTION 'first distributed lock acquisition failed'; END IF;
 IF public.acquire_market_data_refresh_lock('test-market-refresh',token_b,120) IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'second concurrent lock acquisition should be rejected';
 END IF;
 IF public.release_market_data_refresh_lock('test-market-refresh',token_b) IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'non-owner must not release distributed lock';
 END IF;
 released := public.release_market_data_refresh_lock('test-market-refresh',token_a);
 IF released IS DISTINCT FROM true THEN RAISE EXCEPTION 'lock owner could not release lease'; END IF;
 reservation := public.reserve_twelve_data_credits(199,200);
 IF reservation->>'allowed' <> 'true' THEN RAISE EXCEPTION 'credit reservation below limit was rejected: %',reservation; END IF;
 reservation := public.reserve_twelve_data_credits(2,200);
 IF reservation->>'allowed' <> 'false' THEN RAISE EXCEPTION 'credit reservation over daily limit was accepted: %',reservation; END IF;
END $;

-- RLS: authenticated user A cannot see user B's private holdings.
INSERT INTO public.holdings(created_by_id,ticker,name,units,avg_cost,currency,investment_id,account_type)
SELECT user_a,'SIA','User A test holding',1,10,'BWP',investment_id,'demo' FROM _sureinvest_test_ids
UNION ALL
SELECT user_b,'SIB','User B test holding',1,10,'BWP',investment_id,'demo' FROM _sureinvest_test_ids;

SELECT set_config('request.jwt.claim.sub',(SELECT user_a::text FROM _sureinvest_test_ids),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE visible_count integer; leaked_count integer;
BEGIN
 SELECT count(*) INTO visible_count FROM public.holdings;
 SELECT count(*) INTO leaked_count FROM public.holdings WHERE ticker='SIB';
 IF visible_count < 1 OR leaked_count <> 0 THEN
   RAISE EXCEPTION 'holdings RLS isolation failed: visible %, leaked %',visible_count,leaked_count;
 END IF;
END $$;
RESET ROLE;

ROLLBACK;
