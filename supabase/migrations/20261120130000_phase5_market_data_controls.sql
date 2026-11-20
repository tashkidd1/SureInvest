-- Shared market-data lock and atomic Twelve Data credit reservations.
CREATE TABLE IF NOT EXISTS public.market_data_refresh_locks (
  lock_key text PRIMARY KEY,
  owner_token uuid NOT NULL,
  lease_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.twelve_data_daily_usage (
  usage_date date PRIMARY KEY,
  credits_reserved integer NOT NULL DEFAULT 0 CHECK (credits_reserved >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.acquire_market_data_refresh_lock(p_lock_key text,p_owner_token uuid,p_lease_seconds integer DEFAULT 900)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows integer;
BEGIN
 IF p_lock_key IS NULL OR length(trim(p_lock_key))=0 OR p_owner_token IS NULL OR p_lease_seconds<30 OR p_lease_seconds>3600 THEN RETURN false; END IF;
 INSERT INTO public.market_data_refresh_locks(lock_key,owner_token,lease_until)
 VALUES(p_lock_key,p_owner_token,now()+make_interval(secs=>p_lease_seconds))
 ON CONFLICT(lock_key) DO UPDATE SET owner_token=EXCLUDED.owner_token,lease_until=EXCLUDED.lease_until,updated_at=now()
 WHERE public.market_data_refresh_locks.lease_until<now();
 GET DIAGNOSTICS v_rows=ROW_COUNT; RETURN v_rows=1;
END $$;
CREATE OR REPLACE FUNCTION public.release_market_data_refresh_lock(p_lock_key text,p_owner_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows integer;
BEGIN
 DELETE FROM public.market_data_refresh_locks WHERE lock_key=p_lock_key AND owner_token=p_owner_token;
 GET DIAGNOSTICS v_rows=ROW_COUNT; RETURN v_rows=1;
END $$;
CREATE OR REPLACE FUNCTION public.reserve_twelve_data_credits(p_credits integer,p_daily_limit integer DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_usage public.twelve_data_daily_usage%ROWTYPE;
BEGIN
 IF p_credits IS NULL OR p_credits<1 OR p_credits>100 OR p_daily_limit IS NULL OR p_daily_limit<1 THEN
  RETURN jsonb_build_object('allowed',false,'reason','invalid_reservation');
 END IF;
 INSERT INTO public.twelve_data_daily_usage(usage_date,credits_reserved)
 VALUES((now() AT TIME ZONE 'UTC')::date,p_credits)
 ON CONFLICT(usage_date) DO UPDATE SET credits_reserved=public.twelve_data_daily_usage.credits_reserved+EXCLUDED.credits_reserved,updated_at=now()
 WHERE public.twelve_data_daily_usage.credits_reserved+EXCLUDED.credits_reserved<=p_daily_limit
 RETURNING * INTO v_usage;
 IF NOT FOUND THEN
  SELECT * INTO v_usage FROM public.twelve_data_daily_usage WHERE usage_date=(now() AT TIME ZONE 'UTC')::date;
  RETURN jsonb_build_object('allowed',false,'used',COALESCE(v_usage.credits_reserved,0),'ceiling',p_daily_limit,'remaining',GREATEST(0,p_daily_limit-COALESCE(v_usage.credits_reserved,0)));
 END IF;
 RETURN jsonb_build_object('allowed',true,'used',v_usage.credits_reserved,'ceiling',p_daily_limit,'remaining',GREATEST(0,p_daily_limit-v_usage.credits_reserved));
END $$;
REVOKE ALL ON FUNCTION public.acquire_market_data_refresh_lock(text,uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.release_market_data_refresh_lock(text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reserve_twelve_data_credits(integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_market_data_refresh_lock(text,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_market_data_refresh_lock(text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_twelve_data_credits(integer,integer) TO service_role;
ALTER TABLE public.market_data_refresh_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twelve_data_daily_usage ENABLE ROW LEVEL SECURITY;
