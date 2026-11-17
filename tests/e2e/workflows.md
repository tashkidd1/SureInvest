# SureInvest E2E workflow checklist

Manual / CI checklist for core flows. Prefer running against local Supabase (`supabase start` + `functions serve`).

## 1. Registration & onboarding

1. Open `/register`, create account with email + password.
2. Confirm email (Inbucket at `http://127.0.0.1:54324` locally).
3. Complete onboarding: experience → primary goal → **risk tolerance** → name.
4. Expect redirect to dashboard with **P10,000** demo cash.
5. Profile row: `onboarding_completed = true`, preferences stored.

## 2. Trading (Demo)

1. Markets → open a global or BSE symbol → Buy 1 unit.
2. Cash decreases; holdings show the position; Transactions lists a `buy`.
3. Repeat the same request with the **same `client_ref`** → response `duplicate: true`, single ledger row.
4. Sell partial units → holdings reduce; cash increases.
5. Real account: trade attempt returns error (Real trading disabled).

## 3. Goals

1. Create a goal with target amount.
2. Contribute less than remaining → progress updates; cash decreases.
3. Contribute with duplicate `client_ref` → idempotent success.
4. Contribute enough to complete → status `completed`.

## 4. Auto-Invest

1. Create a weekly Auto-Invest plan on Demo.
2. As admin with cron secret, call `executeRecurringInvestment` with `{ "force": true }`.
3. Expect buy transaction with `client_ref` `autoinvest-<planId>-<date>`.
4. Second force same day → duplicate, no double debit.

## 5. Account separation

1. Toggle Demo / Real in the UI.
2. Demo holdings and goals must not appear under Real (and vice versa).
3. Cash accounts: at most one row per `(user, account_type)`.

## 6. Scheduled function auth

```powershell
# Anonymous → 401
Invoke-WebRequest -Method POST -Uri "$FN/dailySnapshot" -Headers @{ apikey = $anon } -Body "{}"

# Cron secret → 200
Invoke-RestMethod -Method POST -Uri "$FN/dailySnapshot" -Headers @{ apikey = $anon; Authorization = "Bearer $CRON_SECRET" } -Body "{}"
```

## 7. Market-data stale cache

1. Call `refreshMarketData` twice within 10 minutes with cron secret.
2. Second response: global and/or BSE `status` is `fresh` or `deferred`, `stale_cache: true`, prices unchanged.
