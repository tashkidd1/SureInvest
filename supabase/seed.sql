-- Starter catalogue only. Your original Investment/EducationalContent rows
-- lived in Base44's database, not in the code you copied out, so they
-- aren't recoverable here — this just seeds the "Global Market V1" symbols
-- refreshMarketData already knows how to refresh, so the app isn't empty on
-- first run. Add your real BSE-listed catalogue and Learn articles yourself
-- (Supabase Studio > Table Editor, at http://127.0.0.1:54323 once `supabase
-- start` is running), or re-enter what you remember from the live app.

insert into public.investments (ticker, name, category, market, exchange, currency, price, is_demo, featured) values
  ('AAPL', 'Apple Inc.', 'equity', 'global', 'NASDAQ', 'USD', 220.00, true, true),
  ('MSFT', 'Microsoft Corporation', 'equity', 'global', 'NASDAQ', 'USD', 430.00, true, true),
  ('NVDA', 'NVIDIA Corporation', 'equity', 'global', 'NASDAQ', 'USD', 130.00, true, true),
  ('KO', 'The Coca-Cola Company', 'equity', 'global', 'NYSE', 'USD', 68.00, true, false),
  ('AMZN', 'Amazon.com, Inc.', 'equity', 'global', 'NASDAQ', 'USD', 185.00, true, false),
  ('SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'global', 'NYSE', 'USD', 560.00, true, true),
  ('VXUS', 'Vanguard Total International Stock ETF', 'etf', 'global', 'NASDAQ', 'USD', 62.00, true, false),
  ('VNQ', 'Vanguard Real Estate ETF', 'reit', 'global', 'NYSE', 'USD', 92.00, true, false),
  ('VIG', 'Vanguard Dividend Appreciation ETF', 'etf', 'global', 'NYSE', 'USD', 185.00, true, false),
  ('BTC/USD', 'Bitcoin', 'digital', 'global', 'Crypto', 'USD', 62000.00, true, false)
on conflict do nothing;

insert into public.exchange_rates (base, quote, rate, source) values
  ('USD', 'BWP', 13.5, 'fallback')
on conflict do nothing;

-- BSE catalogue, seeded from a live Mansa snapshot (2026-09-11) so tickers
-- match exactly what refreshBse() expects. LETL and SECH use SureInvest's
-- own ticker codes (per TICKER_ALIASES in mansaProvider.ts: LETL->LETS,
-- SECH->SECHABA on the Mansa side) — everything else matches Mansa directly.
insert into public.investments (ticker, name, category, market, exchange, currency, price, is_demo, featured, data_source) values
  ('ACCESS', 'Access Bank Botswana Limited', 'equity', 'botswana', 'BSE', 'BWP', 2.04, true, false, 'mansa'),
  ('ADBF', 'ADBFUND', 'etf', 'botswana', 'BSE', 'BWP', 107.80, true, false, 'mansa'),
  ('ANG', 'Anglo American Plc', 'equity', 'botswana', 'BSE', 'BWP', 769.95, true, false, 'mansa'),
  ('BARC', 'ABSA Bank of Botswana Limited', 'equity', 'botswana', 'BSE', 'BWP', 7.83, true, true, 'mansa'),
  ('BBS', 'BBS', 'equity', 'botswana', 'BSE', 'BWP', 0.70, true, false, 'mansa'),
  ('BIHL', 'Botswana Insurance Holdings Limited', 'equity', 'botswana', 'BSE', 'BWP', 23.76, true, true, 'mansa'),
  ('BOD', 'BMIN', 'equity', 'botswana', 'BSE', 'BWP', 0.20, true, false, 'mansa'),
  ('BOTA', 'Botala Energy Limited', 'equity', 'botswana', 'BSE', 'BWP', 0.87, true, false, 'mansa'),
  ('BTCL', 'Botswana Telecommunications Corporation Limited', 'equity', 'botswana', 'BSE', 'BWP', 1.46, true, false, 'mansa'),
  ('CA-SALES', 'CA Sales Holdings Limited', 'equity', 'botswana', 'BSE', 'BWP', 14.15, true, false, 'mansa'),
  ('CHOBE', 'Chobe Holdings Limited', 'equity', 'botswana', 'BSE', 'BWP', 18.66, true, false, 'mansa'),
  ('CHOP', 'Choppies Enterprises Limited', 'equity', 'botswana', 'BSE', 'BWP', 1.49, true, false, 'mansa'),
  ('CRESTA', 'Cresta Marakanelo Limited', 'equity', 'botswana', 'BSE', 'BWP', 1.17, true, false, 'mansa'),
  ('ENGE', 'Engen Botswana Limited', 'equity', 'botswana', 'BSE', 'BWP', 14.25, true, false, 'mansa'),
  ('FNBB', 'First National Bank Botswana Limited', 'equity', 'botswana', 'BSE', 'BWP', 5.73, true, true, 'mansa'),
  ('FPC', 'The Far Property Company Limited', 'reit', 'botswana', 'BSE', 'BWP', 1.80, true, false, 'mansa'),
  ('G4S', 'G4S Botswana Limited', 'equity', 'botswana', 'BSE', 'BWP', 0.91, true, false, 'mansa'),
  ('GAIA', 'GAIA Renewables 1 Limited', 'equity', 'botswana', 'BSE', 'BWP', 136.00, true, false, 'mansa'),
  ('INV', 'Investec Limited', 'equity', 'botswana', 'BSE', 'BWP', 124.96, true, false, 'mansa'),
  ('LETLOLE', 'Letlole La Rona Limited', 'reit', 'botswana', 'BSE', 'BWP', 3.05, true, false, 'mansa'),
  ('LETL', 'Letshego Holdings Limited', 'equity', 'botswana', 'BSE', 'BWP', 0.84, true, true, 'mansa'),
  ('LUCA', 'Lucara Diamond Corp', 'equity', 'botswana', 'BSE', 'BWP', 4.00, true, false, 'mansa'),
  ('MIN', 'Minergy Limited', 'equity', 'botswana', 'BSE', 'BWP', 0.40, true, false, 'mansa'),
  ('NAP', 'New African Properties Limited', 'reit', 'botswana', 'BSE', 'BWP', 4.06, true, false, 'mansa'),
  ('NEWG', 'NEWGOLD', 'etf', 'botswana', 'BSE', 'BWP', 547.20, true, false, 'mansa'),
  ('NGPL', 'NEWPALLADIUM', 'etf', 'botswana', 'BSE', 'BWP', 179.77, true, false, 'mansa'),
  ('NGPT', 'NEWPLATINUM', 'etf', 'botswana', 'BSE', 'BWP', 253.28, true, false, 'mansa'),
  ('OLYM', 'Olympia Capital Corporation (Botswana) Limited', 'equity', 'botswana', 'BSE', 'BWP', 0.28, true, false, 'mansa'),
  ('PRIM', 'PrimeTime Property Holdings Limited', 'reit', 'botswana', 'BSE', 'BWP', 1.90, true, false, 'mansa'),
  ('RDCP', 'RDC Properties Limited', 'reit', 'botswana', 'BSE', 'BWP', 2.60, true, false, 'mansa'),
  ('SATRIX500', 'SATRIX500', 'etf', 'botswana', 'BSE', 'BWP', 116.71, true, false, 'mansa'),
  ('SATRIXEMG', 'SATRIXEMG', 'etf', 'botswana', 'BSE', 'BWP', 78.41, true, false, 'mansa'),
  ('SATRIXWDM', 'SATRIXWDM', 'etf', 'botswana', 'BSE', 'BWP', 103.82, true, false, 'mansa'),
  ('SCIL', 'Seedco International Limited', 'equity', 'botswana', 'BSE', 'BWP', 3.60, true, false, 'mansa'),
  ('SECH', 'Sechaba Brewery Holdings Limited', 'equity', 'botswana', 'BSE', 'BWP', 40.50, true, true, 'mansa'),
  ('SEFA', 'Sefalana Holding Company Limited', 'equity', 'botswana', 'BSE', 'BWP', 16.00, true, false, 'mansa'),
  ('SHU', 'Shumba Energy Limited', 'equity', 'botswana', 'BSE', 'BWP', 0.90, true, false, 'mansa'),
  ('STAN', 'Standard Chartered Botswana Limited', 'equity', 'botswana', 'BSE', 'BWP', 8.77, true, true, 'mansa'),
  ('TLOU', 'Tlou Energy', 'equity', 'botswana', 'BSE', 'BWP', 0.53, true, false, 'mansa'),
  ('TURN', 'Turnstar Holdings Limited', 'reit', 'botswana', 'BSE', 'BWP', 2.06, true, false, 'mansa'),
  ('VGE-ETF', 'VGEPFAM', 'etf', 'botswana', 'BSE', 'BWP', 9.13, true, false, 'mansa')
on conflict do nothing;
