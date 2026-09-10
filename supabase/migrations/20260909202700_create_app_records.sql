/*
# Create the InvestBW compatibility data layer

This migration replaces the former Base44-only storage with one durable Supabase table
that can hold the existing InvestBW records while the visible screens are preserved.

1. New Tables
- `app_records`
- `id` (uuid): record identifier returned to the app.
- `entity` (text): logical record type such as Profile, Investment, Goal, or Transaction.
- `owner_id` (uuid): authenticated owner for private records; null for shared catalogue records.
- `data` (jsonb): the record's application fields.
- `created_at` (timestamptz): creation timestamp.

2. Security
- Row level security is enabled.
- Authenticated users can read shared catalogue rows and only their own private rows.
- Authenticated users can create, update, and delete only rows owned by their own account.
- Shared rows are readable but cannot be changed from the browser.

3. Seeded content
- Adds a small Botswana and global investment catalogue.
- Adds beginner educational lessons so the site is useful immediately after signup.

4. Important notes
- No existing data is deleted or altered.
- The frontend compatibility layer maps these records back to the shapes used by the existing pages.
*/

CREATE TABLE IF NOT EXISTS public.app_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_records_entity_owner_created_idx
  ON public.app_records (entity, owner_id, created_at DESC);

ALTER TABLE public.app_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read shared and own app records" ON public.app_records;
CREATE POLICY "Read shared and own app records" ON public.app_records
  FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Create own app records" ON public.app_records;
CREATE POLICY "Create own app records" ON public.app_records
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Update own app records" ON public.app_records;
CREATE POLICY "Update own app records" ON public.app_records
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Delete own app records" ON public.app_records;
CREATE POLICY "Delete own app records" ON public.app_records
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

INSERT INTO public.app_records (entity, data)
SELECT 'Investment', value::jsonb FROM jsonb_array_elements($json$[
  {"ticker":"FNBB","name":"First National Bank Botswana","category":"equity","market":"botswana","sector":"Financials","exchange":"BSE","currency":"BWP","price":4.85,"daily_change_percent":1.2,"daily_change":0.06,"previous_close":4.79,"dividend_yield":4.1,"dividend_frequency":"semi-annual","description":"A leading Botswana banking group and a familiar local market name.","featured":true,"is_demo":true,"historical_prices":[4.5,4.6,4.55,4.7,4.72,4.85]},
  {"ticker":"LETL","name":"Letshego Holdings","category":"equity","market":"botswana","sector":"Financials","exchange":"BSE","currency":"BWP","price":1.62,"daily_change_percent":-0.6,"daily_change":-0.01,"previous_close":1.63,"dividend_yield":5.2,"dividend_frequency":"semi-annual","description":"A Botswana-rooted financial services company with regional operations.","is_demo":true,"historical_prices":[1.7,1.68,1.66,1.64,1.63,1.62]},
  {"ticker":"SECH","name":"Sechaba Breweries","category":"equity","market":"botswana","sector":"Consumer","exchange":"BSE","currency":"BWP","price":18.4,"daily_change_percent":0.3,"daily_change":0.05,"previous_close":18.35,"dividend_yield":6.4,"dividend_frequency":"annual","description":"A consumer company listed on the Botswana Stock Exchange.","is_demo":true,"historical_prices":[17.8,18,18.1,18.2,18.35,18.4]},
  {"ticker":"AAPL","name":"Apple Inc.","category":"equity","market":"global","sector":"Technology","exchange":"NASDAQ","currency":"USD","price":226.4,"daily_change_percent":0.8,"daily_change":1.8,"previous_close":224.6,"description":"A global technology company included for learning and portfolio practice.","is_demo":true,"historical_prices":[215,218,220,222,224,226.4]},
  {"ticker":"SPY","name":"SPDR S&P 500 ETF","category":"etf","market":"global","sector":"Diversified","exchange":"NYSE","currency":"USD","price":548.2,"daily_change_percent":0.4,"daily_change":2.1,"previous_close":546.1,"dividend_yield":1.2,"dividend_frequency":"quarterly","description":"An exchange-traded fund that tracks large US companies.","is_demo":true,"historical_prices":[532,538,540,543,546,548.2]},
  {"ticker":"BTC/USD","name":"Bitcoin","category":"digital","market":"global","sector":"Digital assets","exchange":"Crypto","currency":"USD","price":64200,"daily_change_percent":-1.1,"daily_change":-715,"previous_close":64915,"description":"A highly volatile digital asset for learning about risk and diversification.","is_demo":true,"historical_prices":[61000,62500,61800,63500,64915,64200]}
]$json$) AS value
WHERE NOT EXISTS (SELECT 1 FROM public.app_records WHERE entity = 'Investment');

INSERT INTO public.app_records (entity, data)
SELECT 'EducationalContent', value::jsonb FROM jsonb_array_elements($json$[
  {"title":"What is a stock?","category":"basics","level":"beginner","summary":"Learn what owning a share of a company means.","content":"A stock represents a small ownership share in a company. When the company grows, the value of the share may rise. Stocks can also fall, so diversification and patience matter.","read_time":4},
  {"title":"Understanding diversification","category":"strategies","level":"beginner","summary":"See why investors spread money across different assets.","content":"Diversification means spreading investments across companies, sectors, markets, or asset types. It cannot remove all risk, but it can reduce the impact of one investment performing poorly.","read_time":5},
  {"title":"How dividends work","category":"basics","level":"beginner","summary":"Understand how some companies return cash to shareholders.","content":"A dividend is a payment a company may make to shareholders from its profits. Dividends are not guaranteed, and companies can change or stop them.","read_time":4}
]$json$) AS value
WHERE NOT EXISTS (SELECT 1 FROM public.app_records WHERE entity = 'EducationalContent');

INSERT INTO public.app_records (entity, data)
SELECT 'ExchangeRate', '{"base":"USD","quote":"BWP","rate":13.5,"source":"fallback"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.app_records WHERE entity = 'ExchangeRate');