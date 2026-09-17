-- Educational fundamentals for the investment detail page.
-- Live quote APIs (Twelve Data free tier, Mansa) only refresh price/change;
-- market_cap, pe_ratio and dividend_yield are not available on those endpoints
-- without paid fundamentals. These values are static demo figures for learning
-- and may lag real markets — they do not replace a paid data feed.

update public.investments as i set
  market_cap = v.market_cap,
  pe_ratio = v.pe_ratio,
  dividend_yield = v.dividend_yield
from (values
  -- Global (USD market_cap in absolute USD)
  ('AAPL', 3400000000000::numeric, 32.5::numeric, 0.45::numeric),
  ('MSFT', 3100000000000, 35.0, 0.75),
  ('NVDA', 2800000000000, 55.0, 0.03),
  ('KO', 270000000000, 24.0, 3.10),
  ('AMZN', 2000000000000, 42.0, 0.00),
  ('SPY', NULL, NULL, 1.30),
  ('VXUS', NULL, NULL, 2.80),
  ('VNQ', NULL, NULL, 3.90),
  ('VIG', NULL, NULL, 1.70),
  ('BTC/USD', NULL, NULL, 0.00),
  -- BSE (market_cap in BWP; yields illustrative)
  ('ACCESS', 4500000000, 8.5, 4.2),
  ('BARC', 12000000000, 9.0, 5.5),
  ('BIHL', 8000000000, 11.0, 4.8),
  ('BTCL', 3500000000, 10.0, 6.0),
  ('FNBB', 15000000000, 8.0, 5.0),
  ('LETL', 6000000000, 7.5, 5.2),
  ('SECH', 4000000000, 12.0, 4.0),
  ('SEFA', 5000000000, 9.5, 3.5),
  ('STAN', 9000000000, 8.2, 5.8),
  ('CHOP', 2500000000, 14.0, 0.0),
  ('ENGE', 3000000000, 11.5, 3.0),
  ('TURN', 2800000000, NULL, 6.5),
  ('FPC', 1500000000, NULL, 5.5),
  ('ANG', 500000000000, 15.0, 2.5),
  ('INV', 80000000000, 10.0, 3.2)
) as v(ticker, market_cap, pe_ratio, dividend_yield)
where i.ticker = v.ticker
  and (i.market_cap is null or i.pe_ratio is null or i.dividend_yield is null);
