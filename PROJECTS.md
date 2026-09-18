# SureInvest — Project Status & Claude Handover

**Last updated:** 18 September 2026  
**Repository:** `tashkidd1/SureInvest`  
**Application:** SureInvest  
**Stack:** React + Vite + Tailwind + Supabase/Postgres + Supabase Edge Functions

## 1. Current project state

SureInvest is a Botswana-focused investment education and simulation platform supporting BSE-listed assets and selected global assets.

The application has moved beyond the earlier foundation-repair phase and is now in **product hardening, verification, and feature-completion**.

The Demo account is functional for simulated investing. A Real-account foundation exists, but real-money trading is intentionally not enabled.

Core areas already working include:
- Authentication and onboarding
- User isolation / owner-scoped data
- Demo/Real account separation
- Simulated cash
- Buy/sell trading
- Partial selling
- Holdings and portfolio calculations
- Transactions
- Buy/sell notifications
- Goals and goal contributions
- Watchlist
- Investment detail pages
- Auto-Invest execution
- Market-data refresh
- Portfolio snapshots
- Learn content
- Public landing page
- Responsive/mobile navigation

---

# 2. Work completed since the previous major audit

## Security / backend hardening

### Server-side Demo cash top-up
A `demoCashTopUp` Edge Function was added.

It:
- Authenticates the caller.
- Finds the user's Demo cash account.
- Adds exactly P5,000.
- Creates a deposit transaction.
- Attempts rollback if transaction creation fails.
- Creates a success notification on a best-effort basis.
- Returns the resulting balance.

The Cash page now calls the Edge Function instead of directly mutating the cash balance.

### Auto-Invest server-side management
A `manageRecurringInvestment` Edge Function was added for:
- Create
- Update
- Toggle
- Delete

It validates ownership and keeps the operation Demo-only.

The Auto-Invest page now uses this backend function.

### Goal deletion server-side
A `deleteGoal` Edge Function was added with ownership checks.

The Goals page now invokes the function instead of relying on a client-side delete.

### Legacy app_records cleanup
A forward migration was added:

`supabase/migrations/20260916120000_drop_legacy_app_records.sql`

It safely removes the unused `public.app_records` table.

The original create migration was intentionally retained so migration history is not rewritten.

---

# 3. Auto-Invest improvements

Auto-Invest now supports editing an existing plan.

Users can change:
- Investment
- Amount
- Frequency

The next execution date is recalculated after an edit.

Amount validation was added.

In Real mode, creation of new Demo-style plans is hidden/disabled appropriately.

Recurring-investment execution has also been independently tested.

---

# 4. Account-mode separation

The application has Demo and Real account modes.

### Demo
- Simulated balance
- Virtual investments
- Demo transactions
- Demo goals
- Demo Auto-Invest
- Demo cash top-ups

### Real
- No simulated money
- No Demo top-ups
- Trading writes are disabled server-side
- Goal creation/contributions are disabled
- New Demo-style Auto-Invest plans are disabled

The backend also rejects inappropriate Real-account writes rather than relying only on frontend controls.

---

# 5. Dashboard and profile work

The Dashboard was redesigned from the earlier layout.

Current hierarchy:
1. Portfolio value
2. Portfolio performance/history
3. Invested amount
4. Cash
5. Total return
6. Quick actions
7. Goals
8. Market movers
9. Recent activity

The oversized promotional area was removed.

The Profile page was also redesigned into clearer sections:
- Personal information
- Investment preferences
- Account/security
- Direct Security navigation
- Account status

---

# 6. Mobile and UX polish

Completed:
- Account switcher is accessible on mobile.
- Holdings P/L remains visible on small screens.
- Units are shown beneath asset names where appropriate.
- Markets asset filters horizontally scroll on mobile.
- Watchlist and Transactions text truncation/wrapping was improved.
- Empty states now provide useful navigation, such as browsing Markets.
- Cash Withdraw is visibly disabled rather than pretending to work.
- Prominent Demo Mode terminology was changed to **Beta testing**.
- Tooltip/context still makes clear that activity is simulated.

---

# 7. Branding / naming

The product is now consistently branded **SureInvest**.

Completed:
- Logo initials changed from `iB` to `SI`.
- Sidebar, TopBar, NavDrawer and onboarding branding updated.
- Local-storage keys changed from `investbw.*` to `sureinvest.*`.
- Package identity changed from InvestBW to SureInvest.
- README title updated.
- CSS design-system comments updated.
- `index.html` metadata updated.
- The `base44/` directory remains only as reference/compatibility code where required; do not perform a broad rename/refactor simply because of its name.

---

# 8. Public landing page

A new `Landing.jsx` was added.

Routing now behaves as follows:
- Logged-out `/` → public SureInvest landing page.
- Logged-in `/` → Dashboard.
- Other protected routes while logged out → Login.

The application no longer starts directly on an authenticated dashboard for visitors.

---

# 9. Learn section

Learn now has category filter chips.

A migration was added to seed missing lessons by title, covering:
- Investing basics
- BSE
- Demo vs Real
- Goals
- Auto-Invest

The migration is additive and does not intentionally replace existing lesson content.

---

# 10. Portfolio snapshots / cron verification

The scheduled jobs were independently verified in Supabase.

Confirmed active cron jobs include:
- `daily-portfolio-snapshot`
- `execute-recurring-investments`
- The existing market-data refresh job

The daily snapshot cron runs at approximately 23:55 UTC.

A `portfolio_snapshots` row was independently observed around **23:55:02 on 15 September 2026**, confirming the daily snapshot job is actually running unattended.

Additional snapshot rows came from trades/actions and Auto-Invest testing.

Therefore the portfolio history infrastructure should **not be rebuilt merely because the old audit had not verified the cron**.

---

# 11. Global market data

Twelve Data remains the provider for global market prices.

Current implementation includes:
- Server-side Twelve Data API key.
- Global asset basket.
- Price/change updates.
- USD/BWP exchange-rate handling.
- Manual/admin refresh.
- Stale-symbol rotation to respect provider limits.
- Database-backed market data already consumed by the application.

The global price refresh path is functioning.

Do not replace Twelve Data merely because another provider is being considered for fundamentals.

---

# 12. Botswana / BSE market data

Mansa is the selected BSE market-data provider for the planned BSE integration.

Important architectural requirements:
- Server-side Mansa key only.
- No frontend direct Mansa calls.
- Provider-independent MarketDataService.
- Database-backed cache.
- Normalized provider responses.
- Stale-cache fallback.
- Request logging.
- Centralized daily request budget.
- Target approximately <=70 Mansa calls/day when operating under the 100/day Free-tier limit.
- Preserve existing SureInvest investment IDs.
- Do not create duplicate investments.
- Use a curated active BSE market-data basket of roughly 10–15 securities rather than refreshing the whole catalogue.
- Historical data is a later task.
- Mansa attribution is required while using a tier that requires it.

The older BSE integration design memo contains the detailed architecture and testing requirements.

---

# 13. Live fundamentals — current state

A live fundamentals path was implemented instead of using fabricated/static values.

Added:
- `refreshFundamentals` Edge Function.
- Admin-only refresh button in Markets.
- `fundamentals_source`.
- `fundamentals_updated_at`.
- Provider-backed handling of market cap, P/E, dividend yield and dividend frequency when available.
- Botswana requests use Twelve Data's XBOT MIC code.

Old educational/static fundamentals were not intended to be presented as live data.

### Current blocker

The current Twelve Data API key is on a plan that does **not** provide the `/statistics` endpoint.

The admin refresh was successfully invoked and returned the provider error, for example:

> `/statistics is available exclusively with pro or ultra or venture or enterprise plans`

This confirms:
- Admin authentication works.
- The Edge Function is deployed.
- The Markets button invokes the function correctly.
- The failure is a provider-plan limitation, not a SureInvest invocation/authentication bug.

**Do not seed fake fundamentals to hide this.**

The alternative provider/source research for:
- Market cap
- P/E
- Dividend yield
- Dividend frequency
- Dividend dates/calendar

has deliberately been set aside for now and should remain a future task.

Dividend calendar is also a separate feature from the existing user-received `dividends` table.

---

# 14. Dependency / code-quality verification

Local verification completed successfully after dependency cleanup.

Confirmed:
- `npm install` succeeds.
- `npm run build` succeeds.
- `npm run lint` succeeds.

Production build currently completes successfully.

The build reports a large JavaScript chunk (>500 kB after minification), which is a performance optimization item rather than a functional build failure.

NPM currently reports low/moderate vulnerabilities and some allowScripts warnings. Do not blindly use `npm audit fix --force`; dependency upgrades should be deliberate.

---

# 15. Important implementation details / commits

Recent relevant commits include:

- Auto-Invest edit: `b25289dfee6f820fd87e8586e34645ec088ac2fc`
- Legacy app_records cleanup migration: `64fed7ee4e9e0ae95e7d2e09d471236885bab3fd`
- Server-side Demo cash top-up: `d2cb3369619f10ebbecf02ec41a479990ed63c43`
- Cash page integration: `360b524df5f5bd5db251ab620af70552fc317f8f`
- Lint cleanup: `1fdaf327e78f04644d6c9c05be816f02c988549f`, `8197801d42ff717ea30ba993bea2c3a8b75f2569`, `10a1876e55bce4efbe9ce8bc99ff723eef10c953`, `7521d1dd7ac64f2b0f72044f30a7ca8e20832ee6`
- Radix toast dependency correction: `c65a6d25a932346542ba62a346ab7c08d6ef599d`
- Fundamentals admin button: `9bb7648ceccb43592b9b5cdb7b9bc2b07a448838`
- Fundamentals button added to Markets: `4b33bfa43a03cf609b8f6bbb49a29700c35b75a3`
- Fundamentals error details: `f16345b94ed26faf05002c46df06168a5b85d4fb`

---

# 16. Remaining work / backlog

## Immediate product-hardening items

1. Fix persistent Notifications for Demo cash top-ups so the event appears consistently in:
   - Transaction
   - Persistent Notification
   - Toast

2. Continue end-to-end regression testing for:
   - Buy
   - Sell
   - Partial sell
   - Holdings
   - Portfolio
   - Cash
   - Goals
   - Goal contributions
   - Auto-Invest
   - Watchlist
   - Transactions
   - Notifications
   - Demo/Real isolation
   - User isolation

3. Review any remaining awkward card spacing/layout caused by previous sparkline removal.

4. Verify automatic global market-data refresh continues to run as expected.

5. Review and tighten client-side write paths where a user could potentially manipulate financial state through direct PostgREST calls. This is the broader RLS/backend-hardening task that was deliberately left for a later pass.

## Market data

6. Complete the provider-independent BSE/Mansa market-data layer if it is not already fully wired into the current frontend path.

7. Verify:
   - BSE catalogue retrieval
   - FNBB lookup
   - Cached repeated requests
   - Movers from cached data where possible
   - Stale-cache fallback
   - Request logging
   - Daily request budget
   - API-key secrecy
   - Mansa attribution

8. Do not implement historical BSE data in this phase.

## Fundamentals

9. Later research and implement a provider/source for live fundamentals without seeded/fabricated values.

10. Add a separate dividend-calendar data model/source and UI.

11. If a metric is genuinely unavailable from the active provider, show `—` or an honest unavailable message rather than inventing a value.

## Product features

12. Improve the Invest Assistant so it is genuinely portfolio-aware rather than only generic.

13. Allow Invest Assistant to eventually answer historical-price/performance questions once reliable historical market data is available.

14. Review onboarding and make the initial experience clearer without forcing unnecessary complexity.

15. Continue improving profile fields and investment-preference handling.

16. Add/verify any missing notification types, including goal completion where applicable.

## Dashboard / analytics

17. The current Dashboard redesign is already implemented.

18. Future dashboard/analytics work can improve:
   - Portfolio history
   - Allocation
   - Return breakdown
   - Goals
   - Recent activity
   - Market movers

Do not rebuild the Dashboard from scratch without first identifying a concrete problem.

## Real account / production readiness

19. Real-money trading is not ready and must remain disabled.

Before any future real-money functionality:
- Transactional/atomic financial operations are required.
- Strong server-side authorization is required.
- Financial state must not be writable directly by clients.
- Auditability and reconciliation are required.
- Payment/deposit/withdrawal infrastructure must be designed separately.
- Production security review is required.

---

# 17. Architectural principles

Keep this direction:

`Frontend → SureInvest backend/API → reusable service → provider → database/cache → UI`

Prefer one reusable source of truth over feature-specific direct API calls.

For market data in particular:

`Provider → MarketDataService → cache → Markets / Detail / Portfolio / Assistant`

Do not create separate direct-provider implementations for each page.

Preserve existing investment IDs and relationships.

Do not silently rewrite historical data just to make old records look cleaner.

Do not introduce fake/static financial metrics merely to fill empty UI fields.

---

# 18. Claude handover instructions

Claude should begin by reading:
- `README.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- This `PROJECTS.md`
- The current repository state on `main`

Then inspect the actual current code before changing anything.

Important:
- Product name is **SureInvest**.
- Repository is `tashkidd1/SureInvest`.
- Do not call the product InvestBW.
- Do not ask for or use a GitHub PAT supplied in chat. The previous PAT was revoked.
- `base44/` is reference/compatibility code and should not be removed or broadly renamed without a concrete technical reason.
- Do not seed fabricated fundamentals.
- Do not assume Twelve Data `/statistics` works on the current key.
- Do not redesign unrelated systems while fixing a focused issue.
- Verify before changing existing working functionality.
- Prefer small, auditable changes followed by build/lint/testing.

## Current handover point

The application is functional and substantially hardened.

The next developer should treat the project as an existing working product, not a blank-slate rebuild.

The most useful next phase is **targeted hardening and completion of remaining product gaps**, while keeping the existing working trading, account separation, portfolio, goals, Auto-Invest, watchlist, and market-data foundations intact.

---

# 19. Claude (Anthropic) session update — 18 September 2026

This session independently verified the state described in sections 1–18 by reading the actual repository (not the summary alone) and running `npm install`, `npm run lint`, `npm run build` directly. All passed as described. The `daily-portfolio-snapshot` 23:55:02 cron finding in section 10 was independently re-derived from the live `portfolio_snapshots` table in an earlier session and matches exactly — good cross-confirmation from two separate investigations.

One correction to this document: section 12 (Botswana/BSE market data) reads as if the Mansa integration is still pending ("the planned BSE integration", "if it is not already fully wired"). It is not pending — it was built and independently verified end-to-end in an earlier Claude session: Mansa auth header fix (no `Bearer` prefix — this was a real bug that caused every BSE request to 401), request budget gating, snapshot freshness gating, ticker aliasing (`LETL`→`LETS`, `SECH`→`SECHABA`), provider request logging, and a BSE Domestic Companies Index chart via Mansa's free `/indices/{code}/history` endpoint (per-stock `/stocks/{ticker}/history` is confirmed paywalled — 403 on the current key — but the index-level endpoint is free and returns real ~5-month history). Section 16 backlog items 6–8 (BSE catalogue retrieval, cached requests, stale-cache fallback, request logging, daily budget, key secrecy, Mansa attribution) are all already done. Don't re-verify or rebuild this.

Also: backlog item 1 (notification consistency for Demo cash top-up) is already resolved — `invalidateCash()` in `src/lib/queries.js` already invalidates the notifications query key, with a comment noting exactly this. The backlog list just hasn't caught up to the code yet (an instance of this doc's own section 22/"documentation lag" problem).

## New finding this session: financial-write RLS gap (real, not yet fixed)

Mapped every direct client-side entity mutation in the frontend (`grep -rhoE "base44\.entities\.[A-Za-z]+\.(create|update|delete)\(" src`). Result: only two remain — `Profile.update` (display name/preferences) and `Notification.update` (marking own notifications read). Every financial write (CashAccount, Holding, Transaction, Goal, GoalContribution, RecurringInvestment) has been correctly moved into a validating Edge Function. Good work.

However, this doesn't fully close backlog item 5 ("review client-side write paths where a user could manipulate financial state"). Checked which client each Edge Function uses for its actual writes:

- `executeTrade`, `contributeToGoal`, `createGoal`, `demoCashTopUp`, `manageRecurringInvestment`, `deleteGoal` — **all six** use the RLS-scoped client (`base44.entities.X`), not `asServiceRole`, for every write to CashAccount/Holding/Transaction/Goal/GoalContribution/RecurringInvestment.

This is a consistent, deliberate pattern (RLS ownership as the enforcement layer, Edge Function providing value/business-logic validation on top) — not a bug in any one function. But the implication: RLS's `owner insert/update/delete` policies on these tables (`created_by_id = auth.uid()`, no `WITH CHECK` on the actual values) still permit a technically motivated user to write **arbitrary values** to their own rows directly via devtools/raw API, completely bypassing the Edge Function's validation — e.g. `supabase.from('cash_accounts').update({balance: 999999999}).eq('id', ownRowId)` would succeed today, since RLS only checks who owns the row, not what's being written to it.

**Closing this properly requires an architectural change, not a patch**: migrate all six functions' writes from the RLS-scoped client to `asServiceRole` (each already does its own manual ownership check for the delete/update paths — e.g. `deleteGoal` and `manageRecurringInvestment` already compare `existing.created_by_id !== user.id` — so this is a safe swap, not new logic), then add a forward migration removing the `owner insert/update/delete` policies on `cash_accounts`, `holdings`, `transactions`, `goal_contributions`, and `recurring_investments` (keep `owner select` — users still need to read their own data). `Goal`'s insert path (`createGoal`) and its RLS should get the same treatment for consistency, even though it's lower-stakes than balance/holdings manipulation.

This was deliberately **not attempted this session** — it touches every core financial mutation path (trading, goals, Auto-Invest, cash) at once, and a mistake here breaks real functionality, not just security posture. Recommend: do this as its own focused pass, one function at a time, with a build/lint pass and a manual trade+goal+auto-invest+cash-topup regression check after each swap, rather than all six at once.

