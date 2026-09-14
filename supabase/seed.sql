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

-- Fundamentals backfill: sector, description, dividend_frequency are stable
-- facts filled in here. market_cap / pe_ratio / dividend_yield are left
-- NULL deliberately — Twelve Data's Fundamentals endpoint (market cap, P/E)
-- is a paid add-on not included on the free Basic plan, and Mansa's BSE
-- feed doesn't provide them either. Better blank than a stale/invented
-- number in a finance app.
update public.investments as i set
  sector = v.sector,
  description = v.description,
  dividend_frequency = v.dividend_frequency
from (values
  ('AAPL', 'Technology', 'Designs and sells the iPhone, Mac, iPad, and wearables, alongside a growing services business (App Store, iCloud, Apple Music).', 'quarterly'),
  ('MSFT', 'Technology', 'Develops Windows, Office, and Azure cloud services, and is a major investor in enterprise software and AI infrastructure.', 'quarterly'),
  ('NVDA', 'Technology', 'Designs GPUs and AI accelerator chips that power gaming, data centers, and machine learning workloads worldwide.', 'quarterly'),
  ('KO', 'Consumer Defensive', 'Manufactures and markets Coca-Cola and a portfolio of other nonalcoholic beverage brands sold in over 200 countries.', 'quarterly'),
  ('AMZN', 'Consumer Cyclical', 'Runs the world''s largest online retail marketplace alongside Amazon Web Services (AWS), a leading cloud computing platform.', 'none'),
  ('SPY', 'Diversified Fund', 'An ETF tracking the S&P 500 index, giving broad exposure to 500 of the largest publicly traded U.S. companies.', 'quarterly'),
  ('VXUS', 'Diversified Fund', 'An ETF tracking a broad index of non-U.S. stocks across developed and emerging international markets.', 'quarterly'),
  ('VNQ', 'Real Estate', 'An ETF tracking an index of U.S. real estate investment trusts (REITs) across commercial and residential property.', 'quarterly'),
  ('VIG', 'Diversified Fund', 'An ETF tracking U.S. companies with a long history of consistently increasing their dividend payouts.', 'quarterly'),
  ('BTC/USD', 'Digital Assets', 'Bitcoin is a decentralized, blockchain-based digital currency with a capped supply of 21 million coins.', 'none'),

  ('ACCESS', 'Banking', 'Access Bank Botswana Limited provides retail, business, and corporate banking services in Botswana.', 'annual'),
  ('ADBF', 'Diversified Fund', 'A listed fund vehicle traded on the BSE, offering pooled exposure rather than a single-company investment.', 'annual'),
  ('ANG', 'Mining', 'Anglo American Plc is a global mining company producing diamonds, copper, and other metals, dual-listed on the BSE.', 'semi-annual'),
  ('BARC', 'Banking', 'ABSA Bank of Botswana Limited (formerly Barclays Botswana) offers retail, business, and corporate banking services.', 'semi-annual'),
  ('BBS', 'Financial Services', 'Botswana Building Society provides mortgage lending and savings products, and demutualised to list on the BSE.', 'annual'),
  ('BIHL', 'Financial Services and Insurance', 'Botswana Insurance Holdings Limited is a life insurance and financial services group operating across Southern Africa.', 'semi-annual'),
  ('BOD', 'Mining', 'Botswana Diamonds plc explores for and develops diamond deposits in Botswana and the wider region.', 'none'),
  ('BOTA', 'Energy', 'Botala Energy Limited is engaged in oil and gas exploration in Botswana.', 'none'),
  ('BTCL', 'Telecommunications', 'Botswana Telecommunications Corporation Limited provides fixed-line, mobile, and internet services nationally.', 'annual'),
  ('CA-SALES', 'Wholesale & Retail', 'CA Sales Holdings Limited distributes and markets consumer goods (FMCG) across Southern Africa.', 'semi-annual'),
  ('CHOBE', 'Tourism', 'Chobe Holdings Limited operates safari lodges and tourism ventures in and around the Chobe National Park area.', 'annual'),
  ('CHOP', 'Wholesale & Retail', 'Choppies Enterprises Limited operates a chain of discount supermarkets across Botswana and neighbouring countries.', 'none'),
  ('CRESTA', 'Tourism', 'Cresta Marakanelo Limited operates a chain of hotels and lodges across Botswana.', 'annual'),
  ('ENGE', 'Energy', 'Engen Botswana Limited markets and distributes petroleum fuels and lubricants through a national retail network.', 'annual'),
  ('FNBB', 'Banking', 'First National Bank Botswana Limited provides retail, commercial, and corporate banking services nationally.', 'semi-annual'),
  ('FPC', 'Real Estate', 'The Far Property Company Limited is a REIT holding commercial and retail property in Botswana.', 'semi-annual'),
  ('G4S', 'Security Services', 'G4S Botswana Limited provides security, cash management, and related risk services.', 'annual'),
  ('GAIA', 'Energy', 'GAIA Renewables 1 Limited invests in renewable energy generation projects.', 'none'),
  ('INV', 'Financial Services', 'Investec Limited is a specialist international banking and asset management group, dual-listed on the BSE.', 'semi-annual'),
  ('LETLOLE', 'Real Estate', 'Letlole La Rona Limited is a REIT holding industrial, commercial, and retail property in Botswana.', 'semi-annual'),
  ('LETL', 'Financial Services', 'Letshego Holdings Limited provides micro-lending and inclusive financial services across Africa.', 'semi-annual'),
  ('LUCA', 'Mining', 'Lucara Diamond Corp operates the Karowe diamond mine in Botswana, known for recovering large, high-value stones.', 'semi-annual'),
  ('MIN', 'Mining', 'Minergy Limited operates the Masama coal mine in Botswana, supplying thermal coal.', 'none'),
  ('NAP', 'Real Estate', 'New African Properties Limited is a REIT holding retail and commercial property, including shopping centres.', 'semi-annual'),
  ('NEWG', 'Diversified Fund', 'An exchange-traded fund tracking the price of physical gold.', 'none'),
  ('NGPL', 'Diversified Fund', 'An exchange-traded fund tracking the price of physical palladium.', 'none'),
  ('NGPT', 'Diversified Fund', 'An exchange-traded fund tracking the price of physical platinum.', 'none'),
  ('OLYM', 'Financial Services', 'Olympia Capital Corporation (Botswana) Limited is an investment holding company.', 'none'),
  ('PRIM', 'Real Estate', 'PrimeTime Property Holdings Limited is a REIT holding office and retail property in Botswana.', 'semi-annual'),
  ('RDCP', 'Real Estate', 'RDC Properties Limited is a REIT holding commercial and industrial property in Botswana.', 'semi-annual'),
  ('SATRIX500', 'Diversified Fund', 'An ETF tracking the S&P 500 index of large U.S. companies, listed for BSE-based investors.', 'annual'),
  ('SATRIXEMG', 'Diversified Fund', 'An ETF tracking a broad index of emerging-market equities.', 'annual'),
  ('SATRIXWDM', 'Diversified Fund', 'An ETF tracking a broad index of developed-market equities worldwide.', 'annual'),
  ('SCIL', 'Agriculture', 'Seedco International Limited produces and markets certified crop seed varieties across Africa.', 'annual'),
  ('SECH', 'Consumer Defensive', 'Sechaba Brewery Holdings Limited brews and distributes beer and other beverages in Botswana.', 'semi-annual'),
  ('SEFA', 'Wholesale & Retail', 'Sefalana Holding Company Limited operates wholesale and retail food distribution and supermarket chains.', 'semi-annual'),
  ('SHU', 'Mining', 'Shumba Energy Limited is developing coal and energy projects in Botswana.', 'none'),
  ('STAN', 'Banking', 'Standard Chartered Botswana Limited provides retail, business, and corporate banking services.', 'semi-annual'),
  ('TLOU', 'Energy', 'Tlou Energy is developing coal-bed methane gas-to-power projects in Botswana.', 'none'),
  ('TURN', 'Real Estate', 'Turnstar Holdings Limited is a REIT holding shopping centres and commercial property in Botswana and Kenya.', 'semi-annual'),
  ('VGE-ETF', 'Diversified Fund', 'A listed fund vehicle traded on the BSE, offering pooled exposure rather than a single-company investment.', 'annual')
) as v(ticker, sector, description, dividend_frequency)
where i.ticker = v.ticker;
