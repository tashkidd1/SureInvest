# SureInvest: Feature Gap Analysis & Improvement Opportunities

## ✅ Currently Implemented

### Core Features
- **Portfolio Management**: Holdings tracking, cost basis, P&L calculation
- **Investment Catalog**: Global (10 symbols) + BSE (7 stocks) with live price updates via Twelve Data & Mansa
- **Trading**: Simulated buy/sell with fee deduction, transaction history
- **Financial Goals**: Creation, tracking progress, categorized (retirement, education, home, etc.)
- **Watchlists**: Add/remove stocks from watch lists
- **Educational Content**: Learn module with articles by level (beginner, intermediate, advanced)
- **Investment Assistant**: AI chatbot (OpenAI/Anthropic) for educational investment questions
- **Cash Management**: Multi-currency accounts (BWP/USD), balance tracking
- **Recurring Investments**: Automated periodic investing (via AutoInvest page)
- **Notifications**: Trade confirmations, system alerts
- **Market Data**: Live price refresh (30min global, 30min BSE)
- **Currency**: USD/BWP exchange rate tracking with Twelve Data

### Infrastructure
- Multi-tenant authentication (email/OTP + Google OAuth)
- Row-Level Security for data isolation
- Smart refresh tracking (prevents API rate limit abuse)

---

## 🚨 Critical Issues

### 1. **Missing Historical Data & Price History**
- **Problem**: No historical price data = no price charts/trendlines (user reported blank graphs)
- **Impact**: Users can't analyze price trends, chart indicators don't work
- **Solution Options**:
  - Option A: Create hourly/daily snapshots after each refresh (lightweight)
  - Option B: Fetch historical data from Twelve Data (costs API credits)
  - Option C: Implement local historical tracking starting from now (bootstraps over time)
- **Recommendation**: Start with Option A (1 line schema change + 2 lines per refresh)

### 2. **Missing Asset Enrichment**
Currently `NULL` or `'—'`:
- `sector` (critical for allocation analysis)
- `market_cap` (for filtering/comparison)
- `pe_ratio` (fundamental valuation metric)
- `dividend_yield` (income analysis)
- `description` (context)

**Impact**: Portfolio allocation page shows "Other" for all holdings; investors can't filter by fundamentals

### 3. **No Portfolio Performance Analytics**
- Single metric: P&L % total (no YTD, 1M, 3M, 1Y breakdowns)
- No best/worst performer tracking
- No volatility metrics
- No risk-adjusted returns (Sharpe ratio, etc.)

### 4. **Chart/Visualization Issues**
- Recharts not rendering (from user feedback: blank graphs)
- **Likely cause**: Empty/null historical_prices array
- No volume charts, sector allocation is static pie chart only

### 5. **Incomplete Trade Execution**
- Frontend has "Order Type" UI but backend doesn't implement market/limit orders
- No pending orders, no order book simulation
- All trades execute immediately at current price

---

## 🔴 High Priority (Core Functionality)

### 6. **Missing Dividend Tracking**
- Dividend table exists but no refresh logic
- Users can't simulate dividend reinvestment
- No dividend yield calculations on holdings

### 7. **Portfolio Snapshots Not Generated**
- Schema has `portfolio_snapshots` table
- No Edge Function creates daily snapshots
- Performance tracking (historical P&L curve) impossible

### 8. **Incomplete Goal Features**
- Goals created but no progress visualization
- No goal performance alerts ("You're 50% of the way to your target")
- No linked_tickers recommendations ("Buy these to achieve your goal")

### 9. **Recurring Investment Execution**
- UI form exists but no scheduled execution
- Edge Function `executeRecurringInvestment` missing
- Recurring buys never happen automatically

### 10. **Real vs Demo Account Separation**
- Schema supports `account_type: 'demo' | 'real'`
- UI doesn't enforce switching modes
- No real/demo toggle on dashboard

---

## 🟡 Medium Priority (Usability & Content)

### 11. **Minimal Educational Content**
- Learn module has only ~5 articles seeded
- No BSE-specific education (How to invest in BSE? Which BSE stocks?)
- No risk profile assessment (questionnaire missing)

### 12. **Sector Data Missing**
- `investments.sector` is NULL for all BSE stocks
- Hardcoded sector mapping for holdings missing
- Portfolio allocation shows generic "Other"

### 13. **Incomplete Onboarding**
- Onboarding page exists but:
  - No risk questionnaire results → stored preferences
  - No portfolio goal recommendations based on experience level
  - No seeding initial cash account properly

### 14. **Mobile Responsiveness**
- UI uses responsive classes but not tested
- No mobile-specific optimizations (smaller charts, touch-friendly)
- No native mobile app

### 15. **Search/Filter Limitations**
- Markets page can filter by asset type but no:
  - Keyword search (Find "Letshego" by name)
  - Price range filter ($1-10, $10-50)
  - Performance filter (Up >5%, Down >5%)
  - Sector filter (Finance, Tech, etc.)

---

## 🟠 Low Priority (Polish & Optimization)

### 16. **No Export/Reporting**
- Can't export portfolio to CSV/PDF
- No tax reporting export
- No performance report generation

### 17. **No Alerting**
- Stock hits target price → no alert
- Goal milestone reached → no alert
- Dividend payment pending → no alert

### 18. **Security/Compliance**
- No activity audit log (who did what, when)
- No suspicious activity detection
- No terms of service / privacy policy pages
- No 2FA (email/OTP exists but no TOTP)

### 19. **Performance Issues**
- Markets page loads all investments at once (no pagination)
- Investment detail page may re-fetch on every visit
- No service worker / offline mode
- No query optimization for large portfolios

### 20. **LLM Assistant Limitations**
- No access to real portfolio context (can't say "Should I sell my LETS?")
- No streaming support (loads entire response at once)
- No conversation memory/context (stateless)

---

## 📊 Quick Win Improvements (1-2 Hours Each)

1. **Add Sector Mapping**
   ```sql
   -- Add to seed.sql
   UPDATE investments SET sector = 'Financial' WHERE ticker IN ('FNBB', 'BIHL');
   UPDATE investments SET sector = 'Energy' WHERE ticker IN ('ENGE');
   UPDATE investments SET sector = 'Telecom' WHERE ticker = 'BTCL';
   ```

2. **Implement Portfolio Snapshots**
   - Run after each market refresh
   - Store: `{ created_date, portfolio_value, cash_balance, invested, pl, snapshots_count }`

3. **Add Price History Tracking**
   - Append current price to `investment.historical_prices` array after each refresh
   - Enable Recharts to render actual trendlines

4. **Real/Demo Toggle**
   - Add button in app header
   - Filter all queries by `account_type`
   - Show indicator: "📊 DEMO MODE"

5. **Search Bar on Markets**
   - Text input → filters by name/ticker
   - Filter by asset type (already exists)

---

## 🏗️ Medium-Term Architecture Improvements

1. **Subscription-based updates**
   - Real-time price WebSocket (not polling)
   - React Query subscriptions for live updates
   - Reduces API load on Mansa

2. **Notification system**
   - Price alerts ("AAPL > $220")
   - Goal progress notifications
   - Dividend payments

3. **Advanced analytics dashboard**
   - Correlation matrix between holdings
   - Risk-adjusted returns (Sharpe, Sortino)
   - Tax-loss harvesting recommendations

4. **Regulatory compliance**
   - POPIA compliance (data privacy)
   - KYC/AML for real money (if converting to real trading)
   - Audit logging

---

## 🎯 Recommendation: Start With

1. **Fix charts** (1 hour): Implement historical price tracking
2. **Add sector mapping** (30 min): Update seed + make allocation useful
3. **Portfolio snapshots** (1 hour): Enable performance tracking over time
4. **Search markets** (1 hour): Improve discoverability
5. **Real/Demo toggle** (1.5 hours): Support real data later

This gives users analytics (charts), better portfolio insights, and foundational infrastructure for future expansion.
