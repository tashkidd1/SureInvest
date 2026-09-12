-- Learn library. The original content lived in Base44's database and isn't
-- recoverable, so this is freshly written — 12 articles across all 5
-- categories, several with Botswana/BSE-specific context.
insert into public.educational_content (title, category, level, summary, content, read_time, icon) values

('What Is Investing, Really?', 'basics', 'beginner',
'The difference between saving and investing, and why it matters over time.',
'Saving means putting money aside and keeping it safe — a bank account, cash under the mattress. Investing means putting that money to work by buying something (a share of a company, a fund, a bond) with the expectation that it grows in value over time.

The trade-off is risk. A savings account is very safe but usually earns little; an investment can grow much faster, but its value can also fall, sometimes sharply, in the short term. Historically, over long periods (10+ years), diversified investments have tended to outpace inflation and cash savings — but "historically" and "tended to" are doing real work in that sentence. There are no guarantees, and past performance never predicts the future.

This is why investing is generally described as a long-term activity. Money you''ll need in the next year or two — an emergency fund, rent, school fees due next term — belongs in savings, not markets. Money you won''t touch for 5+ years is where investing starts to make more sense, because it gives you time to ride out the inevitable ups and downs.

SureInvest is a simulated environment, which makes it a good place to build the habit of thinking this way before real money is involved: setting a goal, choosing an amount, and watching how a diversified position behaves over time.',
3, 'BookOpen'),

('Stocks, Bonds, and ETFs — What''s the Difference?', 'basics', 'beginner',
'The three building blocks you''ll see across SureInvest''s markets.',
'Stocks (also called shares or equities) represent partial ownership in a company. When you buy a share of FNBB or Apple, you own a small slice of that business — its profits, its risks, its future. Stock prices move based on how investors expect the company to perform.

Bonds are essentially loans. When a government or company issues a bond, they''re borrowing money and promising to pay it back with interest over a set period. Bonds are generally considered lower-risk than stocks, because the issuer has a legal obligation to repay — but they usually offer lower long-term returns too, and they''re not risk-free (issuers can still default).

ETFs (exchange-traded funds) bundle many stocks or bonds into a single tradeable security. Buying one share of an ETF like SPY gives you a small stake in all 500 companies in the S&P 500 index at once. This instant diversification is why ETFs are popular with people who want broad market exposure without picking individual companies.

Most balanced portfolios mix all three: stocks for growth, bonds for stability, and ETFs to spread risk efficiently across many holdings at once.',
4, 'Layers'),

('Understanding Risk and Diversification', 'basics', 'beginner',
'Why "don''t put all your eggs in one basket" is the single most repeated rule in investing.',
'Every investment carries risk — the chance that it loses value. Some of that risk is specific to one company (a bad product launch, a scandal, a lawsuit). Some of it is shared across an entire market or economy (a recession, an interest rate change, a currency shock).

Diversification is the practice of spreading your money across different assets so that no single bad outcome sinks your whole portfolio. If you hold only one stock and it drops 40%, your portfolio drops 40%. If that stock is 5% of a diversified portfolio, the same drop costs you 2%.

Diversification works across several dimensions: across companies (not just one stock), across sectors (banking, mining, retail, tech), across asset types (stocks, bonds, cash), and across geographies (Botswana, South Africa, the US, global markets). SureInvest''s Goals feature is built around this idea — linking a target to a mix of holdings rather than a single bet.

It''s worth being honest about the limit of diversification too: it reduces risk, it doesn''t eliminate it. In a genuine market-wide crisis, most assets can fall together. Diversification is about improving your odds over time, not guaranteeing a smooth ride.',
4, 'Shuffle'),

('How the Botswana Stock Exchange Works', 'markets', 'beginner',
'A quick primer on the BSE — Botswana''s only stock exchange.',
'The Botswana Stock Exchange (BSE) is the country''s national exchange, tracing back to 1989 and formally established in its current form in 1995. It lists both domestic companies (Botswana-incorporated businesses like FNBB, Sechaba, and Chobe Holdings) and foreign companies dual-listed alongside another exchange (like Anglo American and Investec).

Two main indices track performance: the Domestic Company Index (DCI), covering Botswana-incorporated companies, and the Foreign Company Index (FCI), covering the dual-listed names. Because foreign mining companies make up a large share of total market value, the BSE''s overall size is heavily influenced by global commodity prices, even though the DCI (the more "local" index) tends to be dominated by banks, insurers, and retail businesses.

Trading happens on weekdays from 10:00 to 14:00. Compared to exchanges like the JSE (South Africa) or NYSE (United States), the BSE is small and less liquid — meaning some stocks trade infrequently, and prices can move more on smaller volumes. This isn''t a flaw so much as a characteristic of a smaller, developing market, and it''s part of why diversifying beyond just BSE-listed names (which SureInvest''s global assets let you explore) can reduce concentration risk for a Botswana-based investor.',
4, 'Landmark'),

('Reading a Stock Quote', 'tools', 'beginner',
'What all those numbers on an investment''s page actually mean.',
'When you open any asset in SureInvest, you''ll see a handful of numbers. Here''s what each one tells you:

Price is the last traded price — what someone was willing to pay for one share, most recently. Previous close is what the price was at the end of the last trading session, used as the baseline for measuring change.

Daily change and daily change % show how much the price has moved since that previous close, in absolute terms and as a percentage. A stock up "+2.4%" today isn''t inherently good or bad on its own — it''s one day out of thousands, and short-term moves are often noise rather than signal.

Sector tells you what part of the economy a company operates in (banking, mining, retail, and so on) — useful for checking how diversified your holdings actually are. Currency shows what the price is quoted in, which matters when comparing a BWP-denominated BSE stock to a USD-denominated global one.

Market cap and P/E ratio (when available) describe a company''s total value and how its price compares to its earnings — but these require data feeds SureInvest''s current free-tier providers don''t include, so you''ll sometimes see them blank rather than guessed at.',
3, 'LineChart'),

('Dollar-Cost Averaging Explained', 'strategies', 'intermediate',
'Why investing a fixed amount on a schedule can beat trying to time the market.',
'Dollar-cost averaging (DCA) means investing a fixed amount of money at regular intervals — say, P200 every month — regardless of whether prices are up or down that day. Over time, this means you naturally buy more units when prices are low and fewer when prices are high, which averages out your entry price without requiring you to predict anything.

The alternative — trying to "time the market" by investing a lump sum only when you think prices are about to rise — sounds appealing, but reliably predicting short-term price movements is extremely difficult, even for professionals. Missing just a handful of the market''s best days over a decade can meaningfully hurt long-term returns, and those best days often arrive unpredictably, sometimes right after the worst days.

DCA also has a behavioral benefit: it removes a lot of the emotional decision-making from investing. You''re not agonizing over "is now a good time?" every month — the schedule decides for you. This is exactly what SureInvest''s Recurring Investments feature is built to simulate: set an amount, a ticker, and a frequency, and let the schedule do the work.

DCA doesn''t guarantee profit, and if a chosen asset declines over the whole period, DCA won''t protect against that. It''s a discipline tool, not a guarantee.',
4, 'Repeat'),

('Building a Goals-Based Portfolio', 'strategies', 'intermediate',
'Tying your investments to specific goals, rather than a vague idea of "growing wealth".',
'A goal like "retire comfortably" or "grow my wealth" is hard to plan around because it has no size, no deadline, and no clear finish line. A goal like "P50,000 for a house deposit in 4 years" gives you three concrete things to work with: how much, by when, and therefore how much to contribute and how much risk you can reasonably take.

Time horizon should shape how a goal is invested. A goal 15 years away can typically absorb more short-term volatility, because there''s time to recover from a downturn — so it can lean more heavily on stocks and equity ETFs. A goal 18 months away has much less room to recover from a bad year, so it usually calls for more conservative, stable holdings.

Priority matters too when you''re juggling several goals at once (an emergency fund, a home deposit, a retirement fund). It''s generally sensible to secure short-term, high-priority goals (like an emergency fund) with safer assets first, before taking on more risk for longer-term, lower-priority ones.

SureInvest''s Goals feature lets you link specific tickers to a goal and track progress against a target amount and date — a small-scale way to practice this kind of goal-based thinking before applying it to real money.',
4, 'Target'),

('Global Diversification: Why Look Beyond Botswana', 'markets', 'intermediate',
'The case for holding both BSE-listed and international assets.',
'Botswana''s economy, and by extension the BSE, is influenced heavily by a relatively small number of factors: diamond and mineral exports, regional trade with South Africa, and the performance of a handful of large banks and insurers. That concentration isn''t unusual for a smaller economy, but it does mean a portfolio made up entirely of BSE-listed names is exposed to the same handful of risks all at once.

Holding global assets — US or European equities, broad international ETFs, or commodities — spreads that exposure across different economies, currencies, and industries that don''t all move together. When Botswana''s mining sector has a weak year, a globally diversified portfolio isn''t entirely tied to that outcome.

There''s a currency dimension too: BSE-listed assets are priced in Pula (BWP), while most global assets are priced in US dollars. Holding both means your portfolio''s value depends partly on the BWP/USD exchange rate, which cuts both ways — it can help or hurt depending on how the currencies move relative to each other.

This isn''t an argument for abandoning local markets — Botswana-based investors often have good reasons to hold local assets (familiarity, local economic participation, sometimes tax treatment). It''s an argument for not putting everything in one basket, wherever that basket happens to be.',
4, 'Globe'),

('Understanding Dividends', 'basics', 'beginner',
'What a dividend is, why some companies pay them and others don''t, and what "frequency" means.',
'A dividend is a portion of a company''s profit paid out directly to shareholders, usually in cash, on a schedule the company sets — commonly quarterly, semi-annually, or annually. If you own 100 shares of a company paying a P0.50 dividend, you receive P50, regardless of whether the share price went up or down that day.

Not all companies pay dividends. Younger or fast-growing companies (Amazon is a well-known example) often reinvest all their profit back into the business instead — growth, acquisitions, R&D — on the theory that this creates more long-term value than a cash payout would. Older, more established companies in stable industries (banks, utilities, consumer staples) more often pay steady dividends, because they have less need to reinvest every dollar of profit to keep growing.

Dividend frequency and yield are worth checking together. A high dividend on its own isn''t automatically good — sometimes it reflects a falling share price making the same payout look larger as a percentage, or a company nearing the end of its ability to sustain that payout. Consistency over many years is generally a more reassuring sign than a single high number.

In SureInvest, dividend income shows up as its own transaction type, separate from price changes — a reminder that total return is price movement plus dividends, not price movement alone.',
3, 'Coins'),

('Investing Glossary: 20 Terms You''ll See in This App', 'glossary', 'beginner',
'Quick definitions for the vocabulary scattered across SureInvest.',
'Ticker — the short code identifying a security (e.g., FNBB, AAPL).
Portfolio — the full collection of assets you hold.
Holding — one specific position within your portfolio (e.g., 50 units of FNBB).
Market cap — a company''s total value: share price × number of shares outstanding.
P/E ratio — price-to-earnings ratio; share price divided by earnings per share, used to gauge whether a stock looks expensive relative to its profit.
Dividend yield — annual dividend payments as a percentage of share price.
Volatility — how much a price swings up and down over time; higher volatility means larger, more frequent price moves.
Bull market — a sustained period of rising prices.
Bear market — a sustained period of falling prices, typically 20%+ down from a recent high.
Liquidity — how easily an asset can be bought or sold without moving its price much.
REIT — real estate investment trust; a company that owns and often operates income-producing property, traded like a stock.
ETF — exchange-traded fund; a basket of assets traded as a single security.
Diversification — spreading investments across different assets to reduce risk.
Asset allocation — how your money is split across categories like stocks, bonds, and cash.
Rebalancing — adjusting your holdings back toward a target allocation after market moves shift it.
FX rate / exchange rate — the price of one currency in terms of another (e.g., USD/BWP).
Recurring investment — an automatic, scheduled purchase of a set amount.
Watchlist — a list of assets you''re tracking without necessarily owning.
Basis points (bps) — 1/100th of a percentage point; 50 bps = 0.5%.
Demo account — a simulated account used for practice, with no real money involved.',
5, 'BookMarked'),

('How to Read This App''s Charts and Numbers', 'tools', 'beginner',
'A short guide to SureInvest''s price charts and where the data comes from.',
'The line chart on each asset''s page shows its historical closing prices over time. For global assets (US stocks, ETFs), this history is seeded from a real market data provider and then extended by one new data point roughly once a day. For BSE-listed assets, the data provider''s free tier doesn''t offer historical backfill, so those charts build up gradually from real daily prices going forward rather than showing deep history immediately — a shorter line today doesn''t mean less real data, just a more recent starting point.

Prices refresh automatically in the background — global assets on a rotating basis (a handful of the most-stale symbols each cycle, to stay within free API rate limits) and BSE assets from a shared exchange-wide snapshot when the provider''s data has meaningfully updated. You can also trigger a manual refresh if you''re an administrator.

"data_source" on an asset (visible to admins) tells you where its last price update came from — a live provider, or a seeded starting value if no refresh has landed yet. This matters for interpreting how current a number really is, especially for less liquid BSE names that may not trade every single day even on a real exchange.',
3, 'Activity'),

('Common Investing Mistakes Beginners Make', 'strategies', 'beginner',
'A short list of patterns worth recognizing in yourself before they cost you.',
'Checking prices too often. Watching a portfolio daily (or hourly) tends to amplify anxiety without adding useful information — most meaningful investment decisions are made on a timescale of months or years, not minutes.

Chasing recent performance. Buying whatever has gone up the most recently, on the assumption it will keep going up, is one of the most common and costly patterns in investing. Past performance is not a reliable predictor of future returns, and by the time a trend is obvious, much of the gain may already be behind it.

Panic-selling during downturns. Markets fall sometimes — that''s a normal, expected part of investing, not a sign that something has gone wrong. Selling during a downturn locks in the loss and forfeits any recovery; the investors most hurt by a crash are often the ones who sold at the bottom.

Ignoring fees and costs. Small percentage fees compound over decades just like returns do. A seemingly minor difference in fees can meaningfully change a long-term outcome.

Putting too much into one idea. Even a strong conviction about a single company or sector is still a concentrated bet — and concentrated bets carry concentrated risk, in both directions.

None of this is about avoiding risk entirely — investing without any risk isn''t really investing. It''s about taking risk deliberately, with a plan, rather than by accident.',
4, 'AlertTriangle')
;
