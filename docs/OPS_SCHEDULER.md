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

```http
POST /functions/v1/<name>
Authorization: Bearer <CRON_SECRET>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json

{}
```

Anonymous calls return **401**. Missing secret configuration returns **503**.

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
