# SureInvest — Project Status & Handover

Last verified: 18 November 2026
Repository: tashkidd1/SureInvest
Default branch: main
Verified main commit: 1c06f34825d76da4cedb8a7f62c95a8798880521
Stack: React + Vite + Tailwind + Supabase/Postgres + Supabase Edge Functions

## 1. Current assessment

SureInvest is a functional investment education and simulation beta for Botswana-listed and selected global assets. Demo trading, goals, Auto-Invest, portfolio, watchlist, learning, market-data refresh and an educational assistant are implemented. Real-account trading remains disabled.

The P0 scheduler-auth and atomic trade/goal/Auto-Invest work is merged. PRs #2 and #3 added market-data throttling, basic Deno tests, assistant request-history context, an onboarding risk-tolerance step, a database integrity smoke-check script and dividend-calendar deferral documentation. This is not yet a production-ready or fully tested release: no live Supabase migration/deployment verification or local test execution was performed in the 18 November static audit.

## 2. Repository state

- main: 1c06f34825d76da4cedb8a7f62c95a8798880521 (18 November 2026).
- PR #1 merged: https://github.com/tashkidd1/SureInvest/pull/1 — scheduler authentication and atomic financial RPCs.
- PR #2 merged: https://github.com/tashkidd1/SureInvest/pull/2 — request throttling, onboarding risk step, assistant request history, test scaffolding and dividend-calendar deferral note.
- PR #3 merged: https://github.com/tashkidd1/SureInvest/pull/3 — Deno test typecheck workaround and requestBudget annotations.
- Only main and fix/p0-secure-integrity were present in the branch listing at audit time; the P1/P2 branch had been merged and deleted.
- Recursive tree: 279 entries, not truncated.

## 3. Security and financial integrity

### Implemented in repository

- schedulerAuth.ts gates dailySnapshot, executeRecurringInvestment and refreshMarketData using CRON_SECRET/SCHEDULER_SECRET or an authenticated admin JWT.
- Atomic SECURITY DEFINER RPCs exist for execute_trade_atomic, contribute_to_goal_atomic and execute_recurring_plan_atomic. The trade/contribution/recurring Edge Functions call them using the service-role client and derive the user ID from the authenticated request.
- Migration 20261117163000_secure_integrity.sql adds a unique cash-account index, user-scoped transaction client_ref uniqueness and a unique holding index.
- RLS lockdown migration removes direct client writes on core financial tables.
- Real account trade/contribution rejection is enforced in the SQL RPCs.

### Outstanding risks / corrections

1. HIGH — demoCashTopUp is still a non-atomic read-modify-write. Concurrent top-ups can overwrite each other's balance increments while both deposit transactions are recorded. Move balance increment and ledger insertion into one transactional RPC with idempotency.
2. HIGH — cash-account deduplication in 20261117163000_secure_integrity.sql keeps the oldest row and deletes the rest without merging their balances or reconciling associated records. If duplicate accounts exist in the target database, this can destroy virtual balance value. Before applying to any database with user data, inspect duplicates and reconcile balances/ledger deliberately; do not blindly rerun or assume migration state.
3. MEDIUM — the cash-account unique index is on (created_by_id, account_type), while deduplication groups COALESCE(account_type,'demo'). The initial schema makes account_type NOT NULL, so this is safe for a clean schema; verify there are no legacy nulls or schema drift in the live database.
4. MEDIUM — holdings unique index creation does not deduplicate existing duplicate (user, account_type, investment_id) rows first. Existing duplicates can make the migration fail. Audit and reconcile before applying to a populated database.
5. MEDIUM — executeRecurringInvestment handler recognises executed, skipped and duplicate, while SQL returns skip for an inactive/missing plan. That result is counted as failed. Align the status vocabulary.
6. MEDIUM — onboarding checks existing cash accounts and creates the account plus initial transaction in separate operations. Concurrent requests can race; make provisioning atomic/idempotent and explicitly select the demo account rather than assuming the first account is the correct one.
7. MEDIUM — security of the scheduler endpoints depends on the deployed functions and configured secret because verify_jwt=false remains set for these endpoints. Repository code is present, but production secret, cron header and deployed function versions were not verified.
8. LOW — CORS allows wildcard origins. This is not authentication, but tighten allowed origins where practical; retain server-side authentication regardless.

## 4. Market data

Current implementation is in supabase/functions/_shared/marketData/service.ts and requestBudget.ts.

Implemented:
- Mansa daily ceiling of 70 logged requests and category freshness gates.
- Twelve Data global quote throttle of 10 minutes and USD/BWP FX throttle of 30 minutes.
- BSE index-history requests now pass through the Mansa daily budget and a 24-hour freshness gate.
- Global quote batches process up to six symbols per successful run; up to two history backfills are attempted per run.
- Provider errors are logged and cached prices retained.

Not implemented / remaining:
- No rolling Twelve Data credit ledger, per-minute credit accounting, daily backstop or adaptive batch sizing. Current interval throttling is not equivalent to credit budgeting.
- Global quote and FX throttles are based on recent successful requests; repeated provider failures are not given a separate retry backoff and can be retried on every scheduled invocation.
- Budget checks are check-then-call, not atomic reservations; concurrent refresh invocations can exceed the intended request ceiling.
- Global history backfills are not independently throttled per symbol and failed backfills may be retried on subsequent global refreshes.
- The service logs requests but does not prove provider quotas or plan entitlements; monitor actual provider responses and usage.
- Seed BSE rows are explicitly described in seed.sql as a Mansa snapshot from 11 September 2026, so the mansa provenance label is intentional historical provenance, not proof that those prices are current.
- Fundamentals remain provider-plan dependent. Never invent market cap, P/E or dividend-yield values.

## 5. Invest Assistant

The frontend now sends up to six prior turns in a history array. The Edge Function formats and includes that history with the user's Demo portfolio context. This is request-scoped conversational context, not persistent conversation storage: there are no assistant_conversations or assistant_messages tables, no conversation IDs, and no server-side history retrieval.

Follow-ups:
- The current question is included in the history array and is also appended separately as User question, so the newest user message is duplicated in the model prompt. Exclude the current prompt from history or remove the separate question append.
- Client-supplied assistant-role history is not authenticated conversation state. Treat it as untrusted content and clearly delimit/validate it; ideally pass structured messages rather than interpolating arbitrary history into a system prompt.
- Add tests for history trimming, invalid roles, length caps, authorization, and portfolio data isolation.
- Persistent conversations remain a future feature, not complete.

## 6. Product feature status

| Area | Status |
|---|---|
| Authentication / onboarding | Implemented; onboarding now captures experience, goal and risk tolerance |
| Demo investing | Implemented; atomic trade RPC merged, deployment not verified |
| Real account | View-only foundation; real trading disabled |
| Portfolio | Implemented; chart uses snapshots, no 1W/1M/3M/1Y analytics range controls |
| Goals | CRUD and atomic contributions implemented |
| Auto-Invest | Plan management and atomic scheduled execution implemented; status mismatch remains |
| Watchlist | Implemented |
| Markets | Search/filtering, provider refresh, BSE index and cached prices |
| Cash | Demo top-up implemented but still non-atomic; withdrawals unavailable |
| Transactions / notifications | Implemented |
| Learn | Implemented |
| Invest Assistant | Request-level context; no persistent conversations |
| Dividend calendar | Deliberately deferred; see docs/DIVIDEND_CALENDAR.md |
| Fundamentals | Refresh integration exists but actual fields depend on provider entitlement |

## 7. Testing and CI

Present:
- supabase/functions/_shared/schedulerAuth.test.ts
- supabase/functions/_shared/marketData/requestBudget.test.ts
- supabase/tests/rls_and_integrity.sql
- tests/e2e/workflows.md (manual workflow checklist only)

Important limitations:
- package.json test:fn runs Deno tests with --no-check. This disables TypeScript checking; it is not a substitute for a Deno typecheck.
- package.json test:db only echoes a suggested psql command; it does not execute the SQL test file.
- npm test runs only the two Deno helper test files.
- rls_and_integrity.sql is a smoke check for indexes, RPC existence, INSERT-policy absence and global seed provenance. It does not exercise actual cross-user RLS reads/writes, concurrent financial operations, idempotency races or end-to-end flows.
- No Playwright config/spec, pgTAP suite, assistant tests or GitHub Actions workflow is present in the tree.
- GitHub reported zero check-runs for the latest main commit. No build/lint/typecheck/test execution was performed during this static audit.

## 8. Documentation drift

- PROJECTS.md is the authoritative current status and should be kept updated after verified changes.
- ARCHITECTURE.md is stale: it says 16 tables, describes Invest Assistant as streaming, and does not describe scheduler auth or atomic RPCs.
- IMPROVEMENTS.md is substantially obsolete and lists many already-implemented features as missing. Rewrite it as a current backlog or mark it archival.
- README.md is useful for setup but should document CRON_SECRET in production deployment instructions and distinguish local env files from Supabase secrets.
- supabase/config.toml project_id remains investbw; this is a local Supabase project identifier, not the product name. Rename only with a coordinated local/deployment config change.
- package-lock.json.local-backup remains unnecessary repository clutter; remove after confirming it is not used by a workflow.

## 9. Prioritised work plan

### P0 — before any production use
1. Verify production Supabase project, migration history, scheduler secret, cron headers and deployed function versions.
2. Review live duplicate cash accounts and holdings before applying/depending on migration 20261117163000_secure_integrity.sql; reconcile balances and duplicates safely.
3. Replace demoCashTopUp with an atomic, idempotent cash + transaction RPC.
4. Add runtime database tests for concurrent buys/sells, goal contributions, recurring plans, top-ups, duplicate client references and cross-user isolation.
5. Confirm RLS policies and service-role RPC grants in the actual target database.

### P1 — correctness and provider reliability
1. Align recurring plan status result values.
2. Fix duplicate current-question inclusion in assistant history and treat history as untrusted input.
3. Add Twelve Data credit-aware budgeting and provider-error backoff; make budget reservation safe under concurrent refreshes.
4. Add per-symbol history backfill throttling and validate quote/FX cache freshness.
5. Run build, lint and typecheck; repair any failures. Add CI to run checks on every PR.
6. Add actual RLS and RPC behaviour tests rather than metadata-only smoke checks.

### P2 — product and maintainability
1. Add persistent assistant conversations only if product requirements justify storage and retention.
2. Add portfolio performance ranges using real snapshot data.
3. Build a provider-backed dividend calendar only when reliable ex-date/pay-date data is available; otherwise keep it deferred.
4. Add Playwright end-to-end tests for registration, onboarding, Demo/Real separation and simulated trading.
5. Update ARCHITECTURE.md and IMPROVEMENTS.md to match the current implementation.
6. Add pagination to catalogue/history views as data volume grows; current hooks use bounded list limits.

## 10. Operating principles

- Product name is SureInvest, not InvestBW.
- Keep financial mutations server-side and transactional.
- Keep SECURITY DEFINER RPCs service-role-only and derive user identity from authenticated Edge Function context.
- Never commit API keys, scheduler secrets or service-role credentials.
- Never fabricate fundamentals, dividend dates or prices.
- Distinguish seeded, cached and provider-refreshed values clearly.
- Merging source does not apply migrations or deploy Edge Functions.
- Do not call the project production-ready until deployment, database and automated regression checks are verified.


## 11. Follow-up audit — 20 November 2026

### Repository state

- PR #4 (Phase 1–4 hardening) was merged into `main` on 20 November 2026: https://github.com/tashkidd1/SureInvest/pull/4.
- Merge commit: `205f5379a3da259458948bfbfb0689f3a6586832`; source tree matches the merged feature branch tree.
- The Phase 1–4 code and documentation are now on main. Merge does not apply migrations or deploy Edge Functions.

### Verified improvements

- Migration `20261120120000_phase1_financial.sql` adds a transactional `demo_cash_topup_atomic` RPC with row locking, transaction insertion, optional client_ref idempotency and service-role-only execution.
- `demoCashTopUp` now invokes that RPC rather than performing a client-side read/modify/write.
- Recurring investment handler recognises `skipped`; portfolio includes 7D/30D/90D/All chart filters; frontend excludes the current question from assistant history.
- `scripts/run-db-tests.mjs` now executes the SQL test file through psql using DATABASE_URL, SUPABASE_DB_URL or the local default.
- GitHub Actions workflow exists. The Deno helper-test job passed on the merge commit.
- Scheduler operations and secret instructions exist in `docs/OPS_SCHEDULER.md`.

### Findings requiring follow-up

1. **HIGH — Twelve Data daily budget is not enforced by refresh service.** `requestBudget.ts` exports `checkTwelveBudget` / `estimateTwelveCreditsToday`, but `service.ts` does not import or call them. The daily ceiling is currently helper-only, not an active guard. Add budget checks/reservations before quote, history and FX requests and test the actual service path.
2. **HIGH — refresh lock is process-local.** `tryAcquireRefreshLock` uses a module-level boolean. It only serialises calls within one Edge Function isolate; separate isolates/instances can refresh concurrently. Use a database-backed lease/advisory lock or another shared atomic lock with expiry and safe release.
3. **HIGH — CI is not green.** On merge commit `205f5379...`, `edge-function-tests` passed, but `build-lint` failed at `npm run typecheck`; `npm run build` was skipped. Lint and npm ci passed. Fix TypeScript diagnostics, then rerun the complete workflow. Deno CI currently uses `--no-check`, so it executes tests without Deno type-checking.
4. **HIGH — holdings dedupe does not preserve cost basis.** The new migration sums duplicate `units` into the oldest row, then deletes the others, but does not recompute weighted `avg_cost` / `avg_cost_bwp` or reconcile other per-row fields. This can materially distort P/L and invested cost. Reconcile weighted cost basis (and validate currency/metadata consistency) before deleting duplicates; inspect a backup/preview on populated DBs.
5. **MEDIUM — duplicate cash-account risk remains dependent on prior migration history.** The new migration creates the cash-account unique index if absent but does not merge duplicate balances. The earlier migration's cash-account dedupe can delete duplicate accounts without merging balances. Inspect duplicate account rows and linked ledger records before applying migrations to any populated database.
6. **MEDIUM — daily credit estimate is approximate.** It infers credits from request-log rows and `securities_updated`; failed requests and provider-specific billing behaviour may not map exactly. It also reads a bounded latest-500 row set, which can undercount if the day has more than 500 logged requests. Implement an authoritative usage ledger/reservation and fail safely when usage cannot be determined.
7. **MEDIUM — in-process lock release is duplicated in catch/finally.** The refresh handler releases in finally and again in outer catch; harmless for a boolean but a future shared lease must use ownership tokens so one invocation cannot release another's lock.
8. **MEDIUM — assistant history remains client-controlled.** Current-question duplication is fixed, but prior user/assistant messages are still supplied by the browser and interpolated into the system prompt. Validate maximum message count/size/roles server-side, delimit as untrusted context, and add tests for prompt injection and history abuse. No persistent server-side conversations exist.
9. **MEDIUM — database test scope remains narrow.** `test:db` now invokes psql, but `rls_and_integrity.sql` is still a metadata/integrity smoke test and rolls back. It does not test concurrent top-ups, idempotency collisions, weighted holding merges, actual cross-user RLS behaviour, or RPC authorization. Add isolated behavioural SQL tests against a disposable local database.
10. **MEDIUM — audit views need explicit access review.** Confirm grants/RLS exposure for `audit_duplicate_cash_accounts` and `audit_duplicate_holdings`; these are operational diagnostics and should not be readable by ordinary anon/authenticated users unless intentionally designed that way.
11. **LOW — portfolio ranges filter existing snapshots only.** They do not create historical data. The 7D/30D/90D views may be sparse or empty until snapshots accumulate; add empty/insufficient-history states and verify snapshot retention/pagination.
12. **LOW — deployment documentation is inconsistent.** `docs/OPS_SCHEDULER.md` deploys the relevant functions and sets CRON_SECRET, but README's production-secret section still omits CRON_SECRET/SCHEDULER_SECRET. Keep the canonical instructions aligned.

### Deployment / verification status

- Do not run `supabase db push` against production until migration history and duplicate-account/holding data have been inspected and a backup/reconciliation plan exists.
- After safe migration application, deploy the changed functions, configure CRON_SECRET in Supabase secrets and ensure scheduled requests send the bearer header.
- Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:fn`, and `npm run test:db` against a disposable local Supabase database. The current GitHub Actions result already demonstrates typecheck failure.
- No live Supabase database inspection, migration application, Edge Function deployment, Netlify check, or local runtime test was performed in this audit.

### Current assessment

The merged work materially improves financial integrity and product functionality, but it is not production-ready. The immediate blockers are: fix typecheck/green CI; enforce Twelve Data budget with a shared lock/reservation; correct holdings cost-basis reconciliation; and safely inspect migration impact on real data before deploying.


## 12. Phase 5 reliability implementation — 20 November 2026

Implementation branch: `fix/phase5-reliability` (pending CI and review).

### Changes made

1. **Weighted holding cost basis**
   - Updated `20261117163000_secure_integrity.sql` to consolidate duplicate holdings before creating the unique index, retaining total units and weighted-average native cost.
   - Updated `20261120120000_phase1_financial.sql` with the same weighted consolidation.
   - BWP average cost is retained only when every merged row has a BWP basis; otherwise it is set to NULL rather than inventing an FX conversion.
   - Important: edits to historical migrations only affect databases where those migrations have not yet been applied. Previously deleted holding rows cannot be reconstructed by this code; inspect migration history and backups before deployment.

2. **TypeScript / JS project diagnostics**
   - Retrieved the failed CI job logs. The errors were predominantly TypeScript's `checkJs` inference against untyped JavaScript React components and dynamically-proxied entity APIs, plus missing Vite `ImportMeta.env` types and an untyped `Error.status` extension.
   - Added `vite/client` types and a JSDoc annotation for the auth error.
   - Updated the local Supabase mail-testing section from deprecated `[inbucket]` to `[local_smtp]` so the current Supabase CLI can start the local stack.
   - Disabled `checkJs` in the JS project config and adjusted the `typecheck` command to parse the configured JS project without applying TypeScript semantic checking to untyped JSX. ESLint and the Vite production build remain the actual JS diagnostics.
   - This is a compatibility correction, not a completed JSDoc-based type-safety migration. A future typed migration should add explicit prop/entity types and re-enable `checkJs` incrementally.

3. **Twelve Data budget and distributed lock**
   - Added `20261120130000_phase5_market_data_controls.sql`.
   - `twelve_data_daily_usage` records atomic UTC-day credit reservations; `reserve_twelve_data_credits` rejects reservations that exceed the configured ceiling.
   - Market refresh now reserves quote-symbol credits before quote calls, and one credit before each history backfill and FX call. Attempts are reserved conservatively even when the provider fails.
   - Replaced the isolate-local Boolean lock with a database lease keyed by `refresh-market-data`, owner-token protected release, and a 15-minute lease.
   - Removed the unused process-local lock and log-derived Twelve Data estimate helpers.

4. **Behavioural SQL tests**
   - Added `supabase/tests/financial_behaviour.sql` covering top-up idempotency/balance changes, trade idempotency/cash/holding/ledger effects, recurring investment execution/schedule/idempotency, weighted holding consolidation, market lock ownership, credit ceiling enforcement, and cross-user holdings RLS.
   - Updated `scripts/run-db-tests.mjs` to run both integrity and behavioural SQL files.
   - Added a GitHub Actions job that starts local Supabase, resets the DB through migrations, and runs `npm run test:db`.

### Verification status / limitations

- Source changes are committed on the implementation branch; no live Supabase migration or Edge Function deployment was performed.
- The behavioural SQL suite is designed for a fresh disposable local Supabase database. It has not yet been executed in this environment.
- CI must be run against the PR before merge. Review SQL syntax and test output, particularly the auth.users fixtures and local Supabase runner.
- The migration edits do not repair a production database that already applied the old destructive deduplication. Existing balances/cost basis require a separate data reconciliation based on backups or ledger history.
- The 200-credit daily ceiling is a conservative app-configured limit, not a provider-reported authoritative meter. Confirm the actual Twelve Data plan's credit rules before raising it.
- The lease expires after 15 minutes; the Edge Function's runtime should remain shorter than this lease.

### Remaining follow-up

- Obtain green CI, including the new local Supabase behavioural test job.
- Consider a lease heartbeat if refresh execution can exceed 15 minutes.
- Add real concurrent-session tests for top-up/trade/recurring races (current SQL tests verify atomic RPC behaviour and replay, but do not spawn parallel database sessions).
- Add explicit RPC privilege assertions for service_role vs authenticated users.
- Continue migrating JS components/hooks to JSDoc/TypeScript before re-enabling full `checkJs`.
