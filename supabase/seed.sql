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
