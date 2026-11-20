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
