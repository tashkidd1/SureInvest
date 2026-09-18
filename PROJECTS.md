# SureInvest — Project Status & Handover

**Last updated:** 18 September 2026 (Grok / xAI session)  
**Repository:** `tashkidd1/SureInvest`  
**Application:** SureInvest  
**Stack:** React + Vite + Tailwind + Supabase/Postgres + Supabase Edge Functions

## 1. Current project state

SureInvest is a Botswana-focused investment education and simulation platform supporting BSE-listed assets and selected global assets.

The application is in **product hardening, verification, and feature-completion**. Demo simulated investing is functional. Real-money trading is intentionally disabled.

Core areas working:
- Auth, onboarding, user isolation, Demo/Real separation
- Simulated cash, buy/sell (including partial sell), holdings, portfolio calcs
- Transactions, notifications, goals, goal contributions, watchlist
- Auto-Invest plan CRUD + scheduled execution
- Market-data refresh (Twelve Data global + Mansa BSE)
- Portfolio snapshots (cron verified)
- Learn content, public landing page, responsive navigation
- **Financial writes locked to service-role Edge Functions** (see §20)

---

## 2–15. Historical notes

Sections covering earlier work (Auto-Invest edit, branding, landing, Learn seeds, snapshots, Mansa, fundamentals blocker, build/lint) remain valid. Key corrections from prior sessions:

- **BSE/Mansa is implemented**, not “planned”. Auth header has no `Bearer` prefix; budget gating, ticker aliases, index history via free endpoint — all done.
- **Demo cash top-up notifications** were already fixed via `invalidateCash()` in `src/lib/queries.js`.
- **Fundamentals**: Twelve Data plan lacks `/statistics`. Do **not** seed fake fundamentals.
- **`base44/`** is compatibility reference only — do not broad-rename.

---

## 16. Remaining work / backlog (updated 18 Sep 2026)

### Done this session (remove from active backlog)

- [x] Financial-write RLS lockdown: client `INSERT/UPDATE/DELETE` policies dropped on cash, holdings, transactions, goals, goal_contributions, recurring_investments
- [x] All financial Edge Functions write via `asServiceRole` + explicit `created_by_id` where needed
- [x] `executeTrade` converted (was still RLS-scoped after migration — would break trades)
- [x] Core smoke path verified by owner: Demo top-up → buy → sell
- [x] Portfolio-aware Invest Assistant (loads Demo cash/holdings/goals into prompt)
- [x] OpenAI-compatible `LLM_BASE_URL` support (NVIDIA NIM, Groq, etc.)

### Immediate / polish

1. **Finish manual E2E** (owner checklist): Goals CRUD, Auto-Invest CRUD, watchlist, Demo/Real isolation, logout → landing → login. Core cash/trade already OK.
2. **Invest Assistant latency / model choice** — currently slow with some NVIDIA models; owner evaluating replacements. See §21.
3. Card spacing / layout after earlier sparkline removal (if still awkward).
4. Confirm automatic global market-data refresh continues to run.

### Market data / fundamentals (later)

5. Live fundamentals from a provider that supports market cap / P/E / dividend yield on the current budget — **no fabricated seeds**.
6. Dividend calendar (separate from user `dividends` table).
7. Historical BSE per-stock data remains paywalled on current Mansa key — do not rebuild around that.

### Product features (later)

8. Onboarding clarity polish.
9. Profile / investment-preference fields.
10. Extra notification types if gaps remain after E2E.
11. Dashboard analytics depth (allocation, return breakdown) — do not rebuild Dashboard from scratch.
12. Invest Assistant historical-price answers only after real history exists.

### Production / Real account

13. Real-money trading stays **disabled** until atomic financial ops, full server authz (already largely in place for Demo), audit, payments, security review.

---

## 17. Architectural principles

`Frontend → Edge Function (auth + validation) → asServiceRole writes → DB`  
`Provider → MarketDataService → cache → UI`

- Prefer one source of truth; no per-page direct provider calls.
- Preserve investment IDs.
- No fake financial metrics to fill empty UI.
- `base44/` name is historical compatibility — not a product name.

---

## 18. Handover instructions

Read first:
- `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, this `PROJECTS.md`, current `main`

Rules:
- Product name: **SureInvest** (not InvestBW).
- Do not use a GitHub PAT from chat.
- Do not seed fabricated fundamentals.
- Do not assume Twelve Data `/statistics` works.
- Small, auditable changes; verify before changing working paths.
- Deploy Edge Functions after changing them; apply migrations on Supabase.

---

## 19. Prior Claude session notes (18 Sep 2026)

Independently verified build/lint, snapshot cron, Mansa integration complete, notification invalidate for top-up. Identified the RLS write gap (functions used user-scoped client for financial writes). That gap is **closed** in the Grok session (§20).

---

## 20. Grok / xAI session — 18 September 2026

### Security: service-role financial writes + RLS lockdown

**Problem:** Edge Functions validated business rules but wrote via the RLS user client. RLS `owner` policies only checked `created_by_id = auth.uid()`, not field values — a user could `update` their own `cash_accounts.balance` via PostgREST and bypass Edge validation.

**Fix:**

1. Migration `supabase/migrations/20260918140000_lock_financial_writes_to_service_role.sql`  
   Drops client `INSERT/UPDATE/DELETE` policies on:
   - `cash_accounts`, `holdings`, `transactions`
   - `goal_contributions`, `recurring_investments`, `goals`  
   SELECT for owners remains.

2. Functions converted to `asServiceRole` for financial mutations (with ownership checks first):
   - `demoCashTopUp`, `createGoal`, `deleteGoal`, `contributeToGoal`
   - `manageRecurringInvestment`, `onboardUser` (cash/tx paths)
   - `executeRecurringInvestment` (already service-role)
   - **`executeTrade`** — critical late fix (`4180290`); still used RLS writes after the migration and would break buy/sell until redeployed

3. Explicit `created_by_id: user.id` on creates where required so rows are not orphaned under service role.

**Deploy requirement:** After pull, deploy at least:

```text
executeTrade, demoCashTopUp, createGoal, deleteGoal,
contributeToGoal, manageRecurringInvestment, onboardUser, investAssistant
```

and ensure the lockdown migration is applied (`supabase db push` or equivalent).

**Verified by owner:** Demo cash top-up and core buy/sell path succeeded after deploy.

### Invest Assistant

- **Portfolio-aware:** `investAssistant` loads Demo holdings, cash, and goals (user-scoped reads) and injects a short summary into the system prompt. Still educational-only; no buy/sell advice.
- **Frontend:** `src/pages/InvestAssistant.jsx` fixed to read `res.answer` (invoke already returns the function body; `res.data.answer` was wrong).
- **Suggestions** include portfolio-oriented chips.

### LLM provider configuration

Implemented in `supabase/functions/_shared/base44Compat.ts` → `invokeLLM`:

| Secret | Purpose | Example |
|--------|---------|--------|
| `LLM_API_KEY` | Provider key | NVIDIA `nvapi-...` |
| `LLM_BASE_URL` | OpenAI-compatible root (incl. `/v1`) | `https://integrate.api.nvidia.com/v1` |
| `LLM_PROVIDER` | `openai` (compatible) or `anthropic` | `openai` |
| `LLM_MODEL` | Model id | see below |

NVIDIA NIM free tier is supported. **Do not commit keys.** Rotate any key that was pasted in chat.

**Model note (owner, end of session):** Some NVIDIA models are slow for the assistant UX. Owner paused while evaluating a faster replacement. Models available on the account include e.g. `z-ai/glm-5.3-flash`, `mistralai/mistral-7b-instruct-v0.3`, `deepseek-ai/deepseek-v4-flash-0731`, `zyphra/zamba2-7b-instruct`. Retired example: `meta/llama-3.1-8b-instruct` → HTTP 410 EOL.

To list models with PowerShell:

```powershell
$headers = @{ Authorization = "Bearer nvapi-..." }
(Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/models" -Headers $headers).data.id
```

Then:

```powershell
supabase secrets set LLM_MODEL=<chosen-id>
supabase functions deploy investAssistant
```

### Relevant commits (this session)

- `4180290` — executeTrade service-role writes
- `1aa9f2e` — portfolio-aware investAssistant
- `c75aef7` — answer parsing + suggestions
- `1a319b8` — `LLM_BASE_URL` OpenAI-compatible providers

---

## 21. Current handover point (stop here)

**Status:** Security pass for financial writes is complete and smoke-tested on cash + trade. Invest Assistant is portfolio-aware and provider-flexible; **model selection for latency is still open** (owner preference).

**Next developer should:**

1. Confirm migration + Edge Functions are deployed on the live project.
2. Optionally finish the E2E checklist (Goals, Auto-Invest, watchlist, Demo/Real).
3. Pick a faster free LLM model and set `LLM_MODEL` if the assistant remains slow.
4. Not reopen RLS write policies on financial tables without a strong reason.
5. Not seed fake fundamentals.

Treat the product as a working Demo platform — targeted gaps only, no blank-slate rebuild.
