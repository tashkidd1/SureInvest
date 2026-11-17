# SureInvest — Project Status & Handover

**Last verified:** 17 November 2026  
**Repository:** tashkidd1/SureInvest  
**Default branch:** main  
**Verified main commit:** 51f9034655614b2e2aeb58cc70515c1d15aa79e5  
**Stack:** React + Vite + Tailwind + Supabase/Postgres + Supabase Edge Functions

## 1. Current project state

SureInvest is a Botswana-focused investment education and simulation platform supporting BSE-listed and selected global assets.

**Current assessment: functional beta undergoing security hardening and verification.** Demo simulated investing is implemented. Real-account trading remains disabled. P0 security/integrity code was merged on 17 November, but production deployment and live Supabase configuration have not been verified.

Implemented areas include authentication and onboarding, Demo/Real separation, simulated cash and trading, holdings, portfolio and transactions, goals and contributions, Auto-Invest, watchlist, notifications, Learn, market-data refresh and portfolio snapshots. Invest Assistant has portfolio context but remains a single-turn backend request flow.

## 2. Repository state

- main points to 51f9034655614b2e2aeb58cc70515c1d15aa79e5.
- PR #1 — Fix/p0 secure integrity — was merged on 17 November 2026: https://github.com/tashkidd1/SureInvest/pull/1
- fix/p0-secure-integrity remains present at 278faf945c0985cf15405d05a1c6e72c08a16c79; this is the merged PR head, not an unmerged change set.
- The merged work adds scheduler authentication, atomic financial RPCs, integrity indexes and a global investment seed-provenance update.
- This document supersedes the previous 18 September 2026 project status.

## 3. Security and financial integrity — merged code

### Scheduled function authentication

Added supabase/functions/_shared/schedulerAuth.ts. It accepts either:
1. Authorization: Bearer <CRON_SECRET> (or SCHEDULER_SECRET), or
2. An authenticated admin JWT for manual/privileged invocation.

Anonymous callers are rejected. The gate is wired into:
- dailySnapshot
- executeRecurringInvestment
- refreshMarketData

Deployment/configuration caveat:
- supabase/config.toml still sets verify_jwt = false for these functions. This is compatible with a custom cron-secret gate, but the in-function check is the effective protection.
- .env.example documents CRON_SECRET; the production secret is not stored in the repository.
- **Not verified:** whether the live Supabase project has CRON_SECRET configured, whether the scheduler sends the matching bearer header, and whether the updated Edge Functions have been deployed.
- Do not consider live scheduled jobs secured until all three checks are confirmed.

### Atomic financial mutations

Migration: supabase/migrations/20261117163000_secure_integrity.sql.

Adds service-role-only SECURITY DEFINER RPCs:
- execute_trade_atomic
- contribute_to_goal_atomic
- execute_recurring_plan_atomic

Trade and goal contribution functions lock the relevant cash/goal rows and apply related balance, holding/goal, transaction and notification writes in one database transaction. The Edge Functions for trade, goal contribution and recurring investment call these RPCs.

The migration also:
- Deduplicates cash accounts before creating a unique index on (created_by_id, account_type).
- Enforces per-user client_ref uniqueness on transactions.
- Adds a unique holding index for (created_by_id, account_type, investment_id).

The RPCs are granted to service_role, not PUBLIC. Real-account trading/contributions remain rejected in the RPCs.

### Follow-up code review items

- execute_recurring_plan_atomic returns status: 'skip' for an inactive or missing plan, but executeRecurringInvestment/index.ts handles executed, skipped and duplicate; the unexpected skip currently falls into the failure counter. Align the status contract.
- The migration's provenance UPDATE applies only to market = 'global' rows whose source is NULL or already seeded. It does not relabel BSE seed rows. supabase/seed.sql still labels BSE seed snapshot rows as mansa; verify their intended provenance and correct this if they are historical seed data rather than a live Mansa refresh.
- Atomicity is implemented in migration source, but this inspection did not connect to the live database to prove the migration has been applied.
- No live concurrency, idempotency, cross-user or RLS tests were executed as part of this verification.

## 4. Market data — current implementation and outstanding work

The current service remains in supabase/functions/_shared/marketData/service.ts and requestBudget.ts, with provider adapters for Twelve Data and Mansa.

The checked-in requestBudget.ts is still the earlier Mansa-focused implementation:
- Mansa has a 70-request/day application safety ceiling.
- Request logging and recent-success checks are implemented.
- recentRequest still filters specifically on provider mansa.

**Not present:** Kimi's proposed Twelve Data rolling 60-minute credit budget, per-minute throttling, daily backstop, adaptive batch sizing and corresponding credit-column migration. Do not describe these protections as implemented.

Other notes:
- Twelve Data global quote/FX and Mansa BSE refresh are routed through the shared service.
- The earlier Mansa index-history budget gap still requires targeted review.
- Twelve Data fundamentals/statistics remains constrained by the current provider plan. Do not fabricate market cap, P/E or dividend yield values.
- Seeded, cached and provider-refreshed prices must be distinguished accurately in the UI. Simulated trading does not mean every reference price is simulated.

## 5. Invest Assistant — current state

The current src/pages/InvestAssistant.jsx stores messages in component state and sends only { question: prompt } to the investAssistant Edge Function.

It is a single-turn backend request flow:
- Displayed messages are local UI state.
- Earlier messages are not submitted as conversation history.
- No assistant_conversations / assistant_messages migration or persistent conversation tables are present.
- No verified conversation-thread identifier, history cap or cross-user conversation-isolation implementation is present.

The assistant can use previously implemented portfolio context, but **persistent conversation continuity is not implemented**.

## 6. Product feature status

| Area | Verified repository status |
|---|---|
| Authentication / onboarding | Implemented; further end-to-end regression coverage needed |
| Demo simulated investing | Implemented; atomic RPC code merged, live deployment not verified |
| Real account | View-only foundation; trading disabled |
| Portfolio / holdings | Implemented; historical analytics range enhancement not present |
| Goals | CRUD and atomic contribution path implemented |
| Auto-Invest | Plan management and atomic scheduled execution implemented; status-contract follow-up above |
| Watchlist | Implemented |
| Markets | Search, filters, shared provider service and BSE index |
| Cash | Demo top-ups; withdrawals not implemented |
| Transactions / notifications | Implemented |
| Learn | Implemented |
| Invest Assistant | Portfolio-aware foundation; persistent conversations not implemented |
| Dividend calendar | Not implemented as a provider-backed calendar feature |
| Live fundamentals | Provider integration exists; statistics endpoint blocked by plan entitlement |

The existing dividends table stores user dividend records; it is not a provider-backed market dividend calendar.

## 7. Kimi work claims — repository verification

Kimi's progress notes described work under sureinvest-patch/P1-market-data, P1-testing and P2-product. Those patch paths and their described implementation are **not present on the current main tree**.

Not found in the checked-in tree:
- Twelve Data credit-budget rewrite and migration 20261118080000_market_data_credits.sql
- marketData.test.ts, pgTAP rls.test.sql and investAssistant.test.ts
- Playwright E2E specs/configuration
- Assistant conversation migration 20261118090000_assistant_conversations.sql and handler factory
- Conversation-threading frontend changes
- src/lib/analytics.js and PerformanceRanges.jsx
- Claimed completed portfolio analytics, onboarding and dividend-calendar components

These remain **unmerged / not verified in the repository**. Progress notes alone are not evidence of committed code. If this work exists in another branch, patch folder or external workspace, it must be pushed or supplied before review and integration.

## 8. Tests, CI and deployment verification

The checked-in package.json exposes build, lint, typecheck, dev and preview scripts.

No automated test script, checked-in Playwright configuration/spec, pgTAP suite, Deno test suite or GitHub Actions workflow was found in the current main tree during this review.

This was a static GitHub source/branch inspection. It did not run npm build/lint/typecheck, Deno tests, Playwright, database migrations, live Edge Function calls or a live Netlify/Supabase deployment check. Do not claim those checks passed based on this review.

## 9. Immediate action plan

### P0 — complete deployment and security verification
1. Confirm the correct production Supabase project and set a strong CRON_SECRET using Supabase secrets.
2. Confirm each external scheduler sends Authorization: Bearer <CRON_SECRET>.
3. Deploy dailySnapshot, executeRecurringInvestment, refreshMarketData, executeTrade and contributeToGoal from merged main.
4. Apply migration 20261117163000_secure_integrity.sql to the intended database.
5. Test anonymous scheduler calls return 401 (or fail closed with 503 if the secret is missing), admin manual invocation works, and scheduled invocations work with the secret.
6. Test trade/contribution concurrency, duplicate client references, cross-user isolation and Demo/Real separation against a test database.

### P1 — resolve correctness and market-data gaps
1. Align recurring-plan RPC status values and handler counters.
2. Reconcile BSE seed provenance with actual data origin.
3. Implement and test Twelve Data credit budgeting before increasing refresh frequency.
4. Revisit Mansa index-history budget enforcement and request-failure retry behaviour.
5. Add automated tests for RLS, atomic financial RPCs, provider budgets and assistant authorization.

### P2 — product enhancements (not yet in main)
1. Persistent Invest Assistant conversations with owner-only access and bounded history.
2. Historical portfolio analytics (1W/1M/3M/1Y) based on actual snapshots.
3. Onboarding UX improvements.
4. A provider-backed dividend calendar with honest empty/unavailable states.
5. End-to-end Playwright coverage for auth, onboarding, Demo/Real separation and core simulated-investment flows.

## 10. Architectural principles and handover rules

Architecture:
Frontend → authenticated Edge Function → service-role / atomic database operation → Postgres  
Provider → MarketDataService → request budget + logging → cache → UI

Rules:
- Product name is **SureInvest**, not InvestBW.
- Keep financial mutations server-side; do not restore client write policies on financial tables casually.
- Keep RPCs service-role-only and validate ownership inside the database operation.
- Do not commit provider keys, scheduler secrets or service-role credentials.
- Do not fabricate financial fundamentals, dividend dates or market prices.
- Keep provider calls centralized and budget-aware.
- Applying migrations and deploying Edge Functions are separate from merging source.
- Make small, auditable changes and update this file only after repository verification.

## 11. Reference files

- README.md — setup and project overview
- ARCHITECTURE.md — system architecture (review for drift when changing architecture)
- AGENTS.md — contributor guidance
- supabase/config.toml — local Supabase configuration and Edge Function JWT settings
- .env.example — required local variables and scheduler-secret instructions
- supabase/migrations/20261117163000_secure_integrity.sql — merged atomic financial operations and integrity constraints
- supabase/functions/_shared/schedulerAuth.ts — scheduler/admin authentication gate
- supabase/functions/_shared/marketData/ — shared market-data service and provider adapters
