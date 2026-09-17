# SureInvest

A simulated investing platform for Botswana (BSE-listed securities and global assets). Practise trading, set goals, and learn investing concepts with virtual cash — no real money moves.

## Stack

- **Frontend**: React + Vite + Tailwind
- **Database + Auth**: Supabase (Postgres, Row Level Security, email/OTP; Google optional)
- **Backend**: Supabase Edge Functions (Deno)
- **Market data**: Twelve Data (global quotes + USD/BWP FX + optional paid fundamentals) and optionally Mansa (BSE)

## One-time setup

1. **Install Docker** and the **Supabase CLI** (`npm install -g supabase`, or see the [Supabase CLI docs](https://supabase.com/docs/guides/cli)).
2. **Install dependencies**:
   ```
   npm install
   ```
3. **Start Supabase locally**:
   ```
   supabase start
   ```
   Keep the printed API URL, anon key, and service role key.
4. **Apply schema and seed data**:
   ```
   supabase db reset
   ```
5. **Configure the frontend** — copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. **Edge Function secrets** — create `.env.local` with:
   ```
   TWELVE_DATA_API_KEY=your_key_here
   LLM_PROVIDER=openai
   LLM_API_KEY=your_key_here
   ```
   `MANSA_API_KEY` is optional (BSE refresh). `LLM_PROVIDER` may be `openai` or `anthropic`.

## Running locally

Two terminals:

```
supabase functions serve --env-file .env.local
npm run dev
```

Open `http://localhost:5173`. Register an account (local confirmation email/OTP appears in Inbucket at `http://127.0.0.1:54324`).

To grant yourself admin (catalogue edits, market refresh), open Studio at `http://127.0.0.1:54323`, find your row in `user_roles`, and set `role` to `admin`.

## Edge Functions

| Function | Purpose |
|----------|---------|
| `onboardUser` | Create profile, demo cash, welcome state |
| `executeTrade` | Buy/sell with balance and holdings updates |
| `createGoal` / `contributeToGoal` / `deleteGoal` | Goal lifecycle |
| `manageRecurringInvestment` | Auto-Invest plan create/update/toggle/delete |
| `executeRecurringInvestment` | Run due recurring plans |
| `demoCashTopUp` | Fixed demo cash top-up |
| `toggleWatchlist` | Add/remove watchlist items |
| `refreshMarketData` | Global + BSE prices and FX |
| `refreshFundamentals` | Admin-only Twelve Data fundamentals refresh when the configured plan provides `/statistics` |
| `dailySnapshot` | Portfolio value snapshots |
| `investAssistant` | LLM investing assistant |
| `migrateCurrency` | Multi-currency migration helper |

### Fundamentals data policy

SureInvest does **not** use static catalogue numbers for market cap, P/E or dividend yield. The `refreshFundamentals` function attempts to fetch these fields from Twelve Data's `/statistics` endpoint and persists only values actually returned by the provider. Twelve Data currently documents `/statistics` as a paid endpoint, so accounts without that entitlement will simply leave the fields unavailable rather than showing invented values. Twelve Data lists Botswana (`XBOT`) among its supported fundamentals markets.

Deploy one function:

```
supabase functions deploy <name>
```

Deploy all:

```
supabase functions deploy
```

Production secrets:

```
supabase secrets set TWELVE_DATA_API_KEY=... MANSA_API_KEY=... LLM_PROVIDER=openai LLM_API_KEY=...
```

## Data

- `supabase/seed.sql` seeds a global + BSE investment catalogue, FX, and starter Learn lessons.
- Add or edit rows in Supabase Studio (Table Editor) as needed.
- A historical migration contains temporary educational fundamentals; the later live-fundamentals migration explicitly clears those values so they are not presented as live data.

## Google sign-in

Disabled by default in `supabase/config.toml`. Enable with Google Cloud OAuth credentials under `[auth.external.google]`, then restart Supabase.

## Reference folder

The `base44/` directory is **reference only** and is not used by the running app. Safe to ignore or delete.
