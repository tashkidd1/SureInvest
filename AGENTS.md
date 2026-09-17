# AGENTS.md

## Project context

SureInvest is a simulated investing app (Botswana BSE + global assets) built with React, Vite, Tailwind, and Supabase.

Start with `README.md` for local setup, environment variables, and Edge Function deploy steps.

## Key paths

- `src/` — frontend application
- `src/api/base44Client.js` — Supabase API compatibility client used by pages/hooks
- `supabase/migrations/` — Postgres schema and RLS
- `supabase/functions/` — Deno Edge Functions
- `supabase/seed.sql` — starter investments, FX, and Learn lessons
- `base44/` — **reference only**; not imported by the running app

## Local workflow

```bash
supabase start
supabase functions serve --env-file .env.local
npm run dev
```

Prefer Edge Functions for financial mutations (trades, goals, recurring plans, demo cash). Do not invent balances or holdings from the client.

## Conventions

- Keep Demo vs Real account separation (`account_type`) intact
- Do not change the trading engine, market-data providers, or snapshot calculations unless fixing a clear bug
- Run relevant checks from `package.json` before finishing larger changes
