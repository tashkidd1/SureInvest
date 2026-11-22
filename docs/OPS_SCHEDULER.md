# Scheduler secrets and Edge Functions

## Required secret

```bash
supabase secrets set CRON_SECRET="<long-random-hex>"
```

Optional alias: `SCHEDULER_SECRET` (same gate).

## Functions that require the secret (or admin JWT)

| Function | Purpose |
|----------|---------|
| `dailySnapshot` | Portfolio snapshots |
| `executeRecurringInvestment` | Auto-Invest execution |
| `refreshMarketData` | Global + BSE + FX refresh |

### HTTP headers

Scheduled calls use two separate credentials:

- `Authorization: Bearer <CRON_SECRET>` authenticates the scheduler to the function's `requireSchedulerOrAdmin` gate.
- `apikey: <secret API key>` identifies the server-side Supabase API key to the API gateway. Store this value in Vault and read it at call time; never hard-code it in a cron command.

The production secret API key for this project is named `superkey`. Edge Functions read it from the platform-injected `SUPABASE_SECRET_KEYS` JSON dictionary using `getSupabaseSecretKey('superkey')`. The helper retains a fallback to `SUPABASE_SERVICE_ROLE_KEY` only when the new dictionary is absent, to support local Supabase CLI environments and staged rollout; if the dictionary exists but does not contain a valid `superkey`, it fails closed. The legacy anon key remains in use for the user-scoped client until the publishable-key migration is separately verified.

```http
POST /functions/v1/<name>
Authorization: Bearer <CRON_SECRET>
apikey: <secret API key read from Vault>
Content-Type: application/json

{}
```

Anonymous calls return **401**. Missing secret configuration returns **503**. The new secret API key is not a JWT and must never be used as the scheduler's `Authorization` bearer token.

Use `timeout_milliseconds := 30000` in the `net.http_post` call. The extension default is 5,000 ms; the live requests were hitting that timeout. Scheduler handlers check the custom CRON_SECRET before attempting user-JWT validation, avoiding an unnecessary Auth round-trip for scheduled calls.

Admins may invoke with their user JWT (`Authorization: Bearer <user-jwt>`) for manual runs. Auto-Invest `{ "force": true }` is admin-only.

## Deploy checklist

Before deploying, inspect the database migration history and take a backup. The Phase 1 holdings consolidation preserves weighted-average cost basis on fresh application. If `20261117163000_secure_integrity.sql` or `20261120120000_phase1_financial.sql` has already been applied, editing the historical migration does not rerun it; do not assume previously deleted duplicate rows or their cost basis can be reconstructed.

Phase 5 adds a database-backed market refresh lease and an atomic UTC-day Twelve Data credit reservation ledger. The default daily reservation ceiling is 200 credits; failed provider attempts remain reserved conservatively.

For local verification, run `supabase start`, `supabase db reset`, then `npm run test:db`. The SQL suite creates temporary auth users and rolls back its fixtures; use a disposable local database only.

```bash
supabase db push
supabase functions deploy demoCashTopUp executeTrade contributeToGoal \
  dailySnapshot executeRecurringInvestment refreshMarketData investAssistant
```

## Duplicate audit (SQL)

```sql
SELECT * FROM public.audit_duplicate_cash_accounts;
SELECT * FROM public.audit_duplicate_holdings;
-- Expect 0 rows after Phase 1 migration.
```
