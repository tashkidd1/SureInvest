# SureInvest Architecture

A self-hosted investment platform for Botswana (BSE + global assets) using React frontend, Supabase backend, and Deno Edge Functions.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                │
│  (Browser, SPA, Tailwind CSS, React Query for state)        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (Self-Hosted or Cloud)                 │
│ ┌──────────────────────────────────────────────────────────┐│
│ │  PostgreSQL Database (RLS, 16 tables)                    ││
│ │  - Investments, Holdings, Goals, Transactions            ││
│ │  - Portfolios, Watchlists, Market Data Requests          ││
│ │  - Users, Profiles, Notifications                        ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────┐│
│ │  Authentication (Supabase Auth)                          ││
│ │  - Email/OTP, Google OAuth                               ││
│ │  - JWT tokens, Row-Level Security (RLS)                  ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────┐│
│ │  Edge Functions (Deno)                                   ││
│ │  - refreshMarketData: Twelve Data + Mansa API            ││
│ │  - investAssistant: LLM-powered recommendations          ││
│ │  - executeTrade, createGoal, contributeToGoal            ││
│ │  - onboardUser, migrateCurrency, toggleWatchlist         ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Twelve Data     Mansa API       LLM APIs
   (Global)       (BSE/Botswana)   (OpenAI/Anthropic)
```

---

## 1. Frontend Layer

### Tech Stack
- **Framework**: React 18 + React Router
- **Build Tool**: Vite (fast HMR, tree-shaking)
- **Styling**: Tailwind CSS + PostCSS
- **State Management**: React Query (@tanstack/react-query) for server state
- **UI Components**: Custom + shadcn/ui patterns
- **Forms**: Controlled components (React hooks)

### Architecture Pattern: Context + Hooks

**Key Contexts:**
- `AuthContext`: Authentication state (user, isAuthenticated, JWT)
- `AccountProvider`: Cash account and portfolio aggregation
- `QueryClientProvider`: React Query central state

### Page Structure (21 pages)

| Category | Pages |
|----------|-------|
| Auth | Login, Register, ForgotPassword, ResetPassword, OAuthConsent |
| Portfolio | Home, Portfolio, InvestmentDetail |
| Markets | Markets, Watchlist |
| Investing | Goals, AutoInvest, InvestAssistant |
| Cash Management | Cash, Transactions |
| User Settings | Profile, Security, Help |
| Education | Learn |
| System | Notifications, PageNotFound, Onboarding |

### Component Organization

```
src/components/
├── layout/
│   └── AppLayout.jsx          # Main shell with nav/sidebar
├── charts/                     # Market/portfolio visualizations
├── common/                     # Shared UI (buttons, forms, etc.)
├── goals/                      # Goal-specific components
├── investments/                # Investment browsing/detail
├── markets/                    # Market data display
├── portfolio/                  # Portfolio analytics
├── trades/                     # Trade execution UI
├── ui/                         # Shadcn-style primitives
├── AuthLayout.jsx
├── ProtectedRoute.jsx          # Auth guard for routes
└── ...
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useAuth()` | Current user, login state, auth errors |
| `usePortfolio()` | Aggregated holdings, balances, performance |
| `useWatchlist()` | Managed watchlist queries |
| `useEntityQueries()` | Generic entity list/get with React Query |
| `use-mobile()`, `use-size()` | Responsive design helpers |

---

## 2. Backend Layer: Supabase

### Database Schema (16 Tables)

**Users & Profiles:**
- `auth.users` (Supabase Auth)
- `user_roles` (admin | user)
- `profiles` (display name, bio, avatar, onboarding state)

**Financial Data:**
- `investments` (BSE & global stock catalog, live prices)
- `holdings` (user's per-stock position and cost basis)
- `cash_accounts` (checking/cash balances by currency)
- `transactions` (buy/sell trade history)
- `dividends` (dividend payments received)
- `portfolio_snapshots` (daily net worth snapshots)

**Features:**
- `goals` (financial targets: education, retirement, etc.)
- `goal_contributions` (deposits toward goals)
- `recurring_investments` (automated buy schedules)
- `watchlists` (saved stock lists)

**Market Data & Admin:**
- `exchange_rates` (USD/BWP cached rates)
- `market_data_requests` (budget tracking for Mansa, Twelve Data)
- `notifications` (system alerts)
- `educational_content` (learning materials)
- `app_settings` (admin configuration)

### Authentication & Security

**Supabase Auth:**
- Email/OTP (magic link) + Google OAuth
- JWT tokens (short-lived access + refresh tokens)
- Session persistence via secure cookies

**Row-Level Security (RLS):**
Every table enforces one of:
- **Owner-only**: User can only read/write own records (`created_by_id = auth.uid()`)
- **Admin-only**: Only admins can write (AppSetting)
- **Authenticated**: All authenticated users can read (AppSetting for display)
- **Shared within account**: Holdings/transactions shared across a user's cash accounts

Example (CashAccount):
```sql
CREATE POLICY "owner read" ON cash_accounts
  FOR SELECT USING (created_by_id = auth.uid());
```

### Edge Functions (Deno Runtime)

Deployed on Supabase; invoked via HTTP from frontend or scheduled by cron.

#### **refreshMarketData** (Scheduled daily + manual)
- **Input**: None (pulls secrets automatically)
- **Secrets**: `TWELVE_DATA_API_KEY`, `MANSA_API_KEY`
- **Flow**:
  1. Fetch global quotes (AAPL, MSFT, NVDA, KO, AMZN, SPY, VXUS, VNQ, VIG, BTC/USD) via Twelve Data
  2. Fetch BSE snapshot (all 41 stocks) via Mansa API
  3. Check daily request budget (70 Mansa calls/day ceiling)
  4. Update Investment table with latest prices + `data_source` tag
  5. Log requests in MarketDataRequest for budget tracking
  6. Update ExchangeRate (USD/BWP) via Twelve Data
  7. Return status for each provider
- **Output**: `{ status, global, bse, fx_rate, message }`

#### **investAssistant** (Real-time)
- **Input**: `{ message: string, contextInvestmentIds?: string[] }`
- **Secrets**: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
- **Flow**:
  1. Fetch user's holdings + market context
  2. Stream messages to OpenAI/Anthropic Chat API
  3. Inject guardrails (no historical price estimates, disclaimers)
- **Output**: Streamed LLM responses

#### **executeTrade** (Synchronous)
- **Input**: `{ action: 'buy'|'sell', investmentId, units, orderType }`
- **Logic**:
  1. Validate balance, margins, settlement
  2. Deduct fees
  3. Create Transaction record
  4. Update Holdings and CashAccount
  5. Emit notification
- **Authorization**: Must be authenticated user

#### **createGoal** (Form submission)
- **Input**: `{ name, targetAmount, deadline, category }`
- **Creates**: Goal + initial transaction record

#### **contributeToGoal** (Form submission)
- **Input**: `{ goalId, amount }`
- **Creates**: GoalContribution record, updates Goal progress

#### **onboardUser** (Post-registration)
- **Input**: Triggered by profile completion
- **Flow**:
  1. Seed initial cash account (demo or real)
  2. Create default portfolio snapshot
  3. Generate welcome notifications

#### **migrateCurrency** (Manual)
- **Input**: `{ fromAccount, toAccount, amount }`
- **Flow**: Deduct from source, deposit to target, apply exchange rate, log transaction

#### **toggleWatchlist** (Quick toggle)
- **Input**: `{ investmentId }`
- **Toggle**: Add/remove from user's watchlist

---

## 3. External APIs

### Twelve Data
- **Endpoint**: `https://api.twelvedata.com`
- **Rate**: 8 API credits/minute (free tier)
- **Use**:
  - Global stock quotes (AAPL, MSFT, NVDA, etc.)
  - USD/BWP foreign exchange rate
- **Cost**: Free tier sufficient for daily refreshes

### Mansa API
- **Endpoint**: `https://mansaapi.com/api/v1/markets/exchanges/BSE/stocks`
- **Auth**: Bearer token (API key)
- **Rate**: 100 requests/day (free tier)
- **Use**: Full BSE snapshot (all 41 stocks at once)
- **Safeguard**: SureInvest caps at 70 requests/day to avoid hitting ceiling
- **Data**: Price, daily change, volume, timestamp
- **Ticker mapping**: LETL→LETS, SECH→SECHABA (aligns with Mansa canonical names)

### LLM Providers
- **OpenAI** (default): `gpt-4o-mini`
- **Anthropic**: `claude-3-5-haiku-latest`
- **Use**: Real-time investment assistant chat, streamed responses

---

## 4. Data Flow Examples

### User Trades a Stock

```
Frontend (executeTrade button)
  ↓ POST /functions/v1/executeTrade
  ↓ { action: 'buy', investmentId, units, orderType }
  ↓
Supabase Edge Function (executeTrade)
  ├─ Validate auth user + permissions
  ├─ Fetch Investment, Holdings, CashAccount
  ├─ Calculate total cost (price × units + fees)
  ├─ Deduct from CashAccount.balance
  ├─ Create Transaction record
  ├─ Update (or create) Holdings record
  ├─ Create Notification ("Trade executed")
  ↓
Update frontend state via React Query invalidation
  ↓ usePortfolio hook refetch
  ↓ UI updates: portfolio value, cash balance, holdings list
```

### Market Data Refresh (Scheduled 2x daily)

```
Supabase Cron Scheduler (UTC)
  ↓ Invoke refreshMarketData
  ↓
Edge Function:
  ├─ Fetch 6 stalest global symbols from Twelve Data
  │   └─ Sort by last_updated, take first 6
  │   └─ Rotate to eventually update all 10 symbols
  │
  ├─ Fetch full BSE snapshot from Mansa
  │   ├─ Check daily budget: if used >= 70, skip (retain cache)
  │   └─ Iterate through 41 stocks, normalize into Investment shape
  │
  ├─ Update Investment.price, daily_change, daily_change_percent
  ├─ Set Investment.data_source = 'twelve_data' | 'mansa'
  ├─ Set Investment.last_updated
  │
  ├─ Log requests in MarketDataRequest
  ├─ Update ExchangeRate (USD/BWP)
  │
  ↓ Return { global: {...}, bse: {...}, fx_rate: ... }
  ↓
Frontend polls or manual button displays status
  ↓ "Global: refreshed 6/10 prices"
  ↓ "BSE: refreshed 38/41 curated securities"
```

### Chat with Investment Assistant

```
Frontend (InvestAssistant page)
  ↓ User types message: "Should I buy MSFT?"
  ↓ POST /functions/v1/investAssistant + stream
  ↓ { message, contextInvestmentIds }
  ↓
Edge Function:
  ├─ Fetch user's Holdings (with current prices)
  ├─ Fetch Investment catalog (context)
  ├─ Build LLM system prompt with guardrails
  ├─ Send message to OpenAI/Anthropic
  ├─ Stream response back to frontend
  ↓
Frontend receives ReadableStream chunks
  ↓ Render streamed text in UI (real-time effect)
```

---

## 5. Client-Server Communication

### SDK Abstraction Layer

**File**: `src/api/base44Client.js`

Replaces the original Base44 SDK. Maintains the same API shape so the app didn't require refactoring:

```javascript
base44.entities.Investment.list()        // → supabase.from('investments').select()
base44.entities.Holdings.filter({...})   // → supabase.from('holdings').select().match({...})
base44.entities.Goal.create({...})       // → supabase.from('goals').insert({...})
base44.functions.invoke('executeTrade', {...})  // → supabase.functions.invoke('executeTrade', {...})
base44.auth.me()                         // → supabase.auth.getUser()
```

This adapter ensures zero changes to 700+ component files.

### React Query Integration

**File**: `src/lib/query-client.js`

Centralized React Query config:
- Stale time: 5 minutes (balances freshness vs API load)
- Retry: 3 attempts with exponential backoff
- Query keys: Defined in `src/lib/queries.js` (e.g., `qk.investments`, `qk.portfolio`)

---

## 6. Deployment & Infrastructure

### Local Development

```bash
supabase start                     # Starts PostgreSQL, Auth, Edge Functions in Docker
npm run dev                        # Vite dev server on :5173
supabase functions serve           # Edge Functions in watch mode
```

### Self-Hosted Deployment

1. **Docker Compose** for Supabase stack (or Supabase Cloud)
2. **Frontend**: Build with `npm run build` → static assets to CDN or web server
3. **Edge Functions**: Deployed via `supabase functions deploy`
4. **Secrets**: Set via `supabase secrets set MANSA_API_KEY=...`

### Environment Configuration

**Frontend** (`.env`):
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

**Edge Functions** (`.env.local` for local dev, or `supabase secrets` for production):
```
TWELVE_DATA_API_KEY=...
MANSA_API_KEY=...
LLM_PROVIDER=openai
LLM_API_KEY=...
LLM_MODEL=gpt-4o-mini
```

---

## 7. Key Design Principles

### Provider-Independent Refresh
- **Twelve Data** handles global assets (10 symbols, rotated)
- **Mansa** handles BSE (all 41 stocks, one batch call)
- Each provider can fail independently; cached prices retained
- Budget tracking prevents hitting API rate limits

### Isolation & Fault Tolerance
- One provider error never blocks the other
- Cached prices from prior runs always preserved
- Per-symbol transaction failures don't affect the batch

### Data Sourcing Transparency
- Every price tagged with `data_source: 'twelve_data' | 'mansa' | 'seeded'`
- UI displays data freshness ("Updated 2 min ago via Mansa")
- Admin can see request logs in MarketDataRequest

### Guardrails for LLM
- Investment assistant won't estimate historical prices
- Includes disclaimer: "For educational purposes; not financial advice"
- Context-limited (user's holdings, not entire market)

### Multi-Tenant Security
- Every query filtered by `auth.uid()` via RLS
- No database query results include other users' data
- Admin functions require explicit role check

---

## 8. Scalability & Future Enhancements

### Horizontal Scaling
- **Frontend**: Stateless, scales via CDN + load balancer
- **Database**: Supabase managed (auto-backups, replication available)
- **Edge Functions**: Auto-scaled by Supabase (or self-hosted Deno)

### Potential Improvements
1. **WebSocket** for real-time portfolio updates (vs polling React Query)
2. **Caching layer** (Redis) for frequently accessed Investment catalog
3. **Batch trade execution** for recurring investments (vs per-trade latency)
4. **Portfolio rebalancing** Edge Function (new)
5. **Tax reporting** integration (SARS, PAYE)
6. **Mobile app** (React Native sharing core API layer)

---

## 9. Technology Decision Matrix

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite | Fast builds, large ecosystem, React Query for server state |
| Styling | Tailwind | Utility-first, small CSS bundles, theme customization |
| Database | PostgreSQL (Supabase) | ACID, RLS, proven reliability, self-hosted via Docker |
| Auth | Supabase Auth | Built-in Google OAuth, email/OTP, RLS integration |
| Edge Functions | Deno | Fast, secure, TypeScript-native, less boilerplate than Node |
| Market Data | Twelve Data + Mansa | BSE coverage (Mansa), global + FX (Twelve Data), free tiers |
| LLM | OpenAI / Anthropic | Chat completion APIs, streaming support, affordable |

---

## 10. File Structure Summary

```
SureInvest/
├── src/
│   ├── App.jsx                    # Root router
│   ├── main.jsx                   # Entry point
│   ├── index.css                  # Global styles
│   ├── api/
│   │   ├── base44Client.js        # Supabase SDK wrapper
│   │   └── supabaseClient.js      # Supabase JS client
│   ├── components/                # 700+ UI components
│   ├── hooks/                     # useAuth, usePortfolio, etc.
│   ├── lib/                       # Context, utilities, queries
│   ├── pages/                     # 21 route pages
│   └── utils/                     # Helpers (formatting, math)
├── supabase/
│   ├── functions/                 # 8 Edge Functions (Deno)
│   ├── migrations/                # SQL schema
│   └── config.toml                # Supabase local config
├── base44/                        # Original Base44 schema (reference)
├── vite.config.js                 # Vite build config
├── tailwind.config.js             # Tailwind theme
└── package.json                   # Dependencies
```

---

This architecture enables rapid local development (instant HMR with Vite), type-safe backend logic (Deno + TypeScript), secure data isolation (RLS), and self-hosting without vendor lock-in.
