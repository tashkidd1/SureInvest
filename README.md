# InvestBW / SureInvest

A simulated investing platform for Botswana (BSE-listed + global assets).
Originally built in Base44; this repo is fully detached from Base44's
runtime — the frontend, database schema, and backend functions now run on
your own Supabase instance (self-hostable via Docker, so you're never locked
out by anyone's subscription).

## Stack

- **Frontend**: React + Vite + Tailwind (unchanged from the original build)
- **Database + Auth**: Supabase (Postgres, Row Level Security, email/OTP + Google auth)
- **Backend logic**: Supabase Edge Functions (Deno) — ports of the original 8 functions
- **Market data**: Twelve Data (global quotes + USD/BWP FX) and optionally Mansa (BSE)

## One-time setup

1. **Install Docker** (Supabase's local stack runs in containers) and the
   **Supabase CLI**: `npm install -g supabase` (or see
   [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)).
2. **Install dependencies**:
   ```
   npm install
   ```
3. **Start Supabase locally**:
   ```
   supabase start
   ```
   This prints a local API URL, anon key, and service role key — keep this
   terminal output, you'll need it next.
4. **Apply the schema and seed data**:
   ```
   supabase db reset
   ```
   (This runs `supabase/migrations/0001_init.sql` then `supabase/seed.sql`.)
5. **Set up your `.env`**:
   ```
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the
   `supabase start` output (step 3).
6. **Set Edge Function secrets for local dev**: create `.env.local` (same
   folder as `.env.example`) with:
   ```
   TWELVE_DATA_API_KEY=your_key_here
   LLM_PROVIDER=openai
   LLM_API_KEY=your_key_here
   ```
   (`MANSA_API_KEY` is optional — leave it unset to skip BSE refresh.
   `LLM_PROVIDER` can be `openai` or `anthropic`.)

## Running it

Two processes, in separate terminals:

```
supabase functions serve --env-file .env.local   # backend functions
npm run dev                                       # frontend
```

Open `http://localhost:5173`, register an account (check
`http://127.0.0.1:54324` — Inbucket — for the confirmation email/OTP in local
dev, since no real email is sent), and you're in.

To make yourself an admin (required for the Investment catalogue, market
data refresh, etc.), open Supabase Studio at `http://127.0.0.1:54323`, find
your row in `user_roles`, and change `role` to `admin`.

## What's included vs. what isn't

- **Included**: full schema with the same RLS rules as the original
  (`supabase/migrations/0001_init.sql`), all 8 backend functions ported
  (`supabase/functions/`), the full frontend unchanged except the API client.
- **Not included**: your original `Investment` and `EducationalContent`
  catalogue rows — those lived in Base44's database, not in the code you
  copied out. `supabase/seed.sql` has a small placeholder set (the 10
  "Global Market V1" symbols the app already knows how to refresh); add BSE
  listings and Learn articles yourself via Supabase Studio.
- **Not ported**: the MCP OAuth consent page (`src/pages/OAuthConsent.jsx`)
  relied on a Base44-hosted OAuth authorization server (`base44/mcp/config.json`,
  never included in the code you copied). It isn't routed anywhere in the
  app currently, so nothing depends on it — leave it as-is or remove it.

## Deploying beyond your machine

Because this uses plain Postgres migrations and standard Deno Edge
Functions, you're not locked into local-only or into Supabase specifically:
`supabase link` + `supabase db push` + `supabase functions deploy` moves
this to a hosted Supabase project (free tier available) whenever you want a
public URL, and the SQL/Deno code would need only minor changes to run on
any other Postgres + edge-function host.

## Google sign-in

Disabled by default (`supabase/config.toml`). To enable it, get OAuth
credentials from the Google Cloud Console, set `enabled = true` and fill in
`client_id` / `secret` under `[auth.external.google]`, then `supabase stop`
and `supabase start` again.

## The old base44/ folder

`base44/` (the original entities/functions/shared code as exported from the
Base44 editor) is kept for reference only — nothing in the running app
imports from it anymore. Safe to delete once you've confirmed everything
works, or keep it as a record of what changed.
