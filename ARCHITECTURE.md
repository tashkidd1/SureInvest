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
│ │  - Trading: executeTrade, manageRecurringInvestment      ││
│ │  - Goals: createGoal, contributeToGoal, deleteGoal       ││
│ │  - Cash: demoCashTopUp, onboardUser                      ││
│ │  - Data: refreshMarketData, dailySnapshot                ││
│ │  - Other: investAssistant, toggleWatchlist, …            ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Twelve Data     Mansa API       LLM APIs
   (Global)       (BSE/Botswana)   (OpenAI/Anthropic)
```

See **README.md** for setup, secrets, and deploy commands.

---

## Edge Functions

| Function | Role |
|----------|------|
| `onboardUser` | Complete onboarding: profile, demo cash, welcome notifications |
| `executeTrade` | Simulated buy/sell; updates cash, holdings, transactions |
| `createGoal` | Create a savings/investment goal |
| `contributeToGoal` | Move demo cash into a goal |
| `deleteGoal` | Delete a goal (ownership-checked) |
| `manageRecurringInvestment` | Create / update / toggle / delete Auto-Invest plans |
| `executeRecurringInvestment` | Execute due recurring plans |
| `demoCashTopUp` | Fixed-amount demo cash top-up (server-enforced) |
| `toggleWatchlist` | Add or remove a watchlist entry |
| `refreshMarketData` | Refresh global (Twelve Data) and BSE (Mansa) prices + FX |
| `dailySnapshot` | Record portfolio value snapshots for charts |
| `investAssistant` | Streaming LLM assistant for investing questions |
| `migrateCurrency` | One-off multi-currency migration helper |

### Deploy

```bash
supabase functions deploy <name>
supabase functions deploy
supabase functions serve --env-file .env.local
```

Secrets: `TWELVE_DATA_API_KEY`, `MANSA_API_KEY` (optional), `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` (optional).

Financial mutations should go through these functions (auth + ownership checks), not direct client writes to cash/holdings/transactions.

---

## Frontend

- React 18 + React Router + Vite + Tailwind + React Query
- Contexts: `AuthContext`, `AccountProvider` (demo/real), QueryClient
- Public marketing page: `Landing` (logged-out `/`); authenticated app shell: `AppLayout`
- API surface: `src/api/base44Client.js` (compatibility client over Supabase)

---

## Database (Postgres + RLS)

Key tables: `investments`, `holdings`, `cash_accounts`, `transactions`, `goals`, `goal_contributions`, `recurring_investments`, `watchlists`, `portfolio_snapshots`, `exchange_rates`, `notifications`, `educational_content`, `profiles`, `user_roles`, `market_data_requests`.

Owner-scoped RLS on user financial data (`created_by_id = auth.uid()`). Admin write policies on catalogue/content where applicable.

---

## External APIs

- **Twelve Data** — global quotes + USD/BWP
- **Mansa** — BSE snapshot (optional key)
- **OpenAI / Anthropic** — Invest Assistant streaming

---

## Local development

```bash
supabase start
supabase functions serve --env-file .env.local
npm run dev
```

Frontend `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

---

## Reference folder

`base44/` is **reference only** and is not used by the running application.
