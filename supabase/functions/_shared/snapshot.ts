// Shared portfolio-snapshot helper. Records the portfolio value (in BWP) after a
// trade or contribution. One snapshot per calendar day per user (upsert by
// date). Uses the USER-SCOPED request client (RLS = caller's own records) —
// reliable, unlike compound asServiceRole filters. Native-currency holdings are
// converted to BWP using the cached rate; cost basis uses stored avg_cost_bwp.
import { getUsdBwpRate, nativeToBwp } from './currency.ts';
export async function recordSnapshot(base44, userId, accountType) {
  const acct = accountType === 'real' ? 'real' : 'demo';
  const rate = await getUsdBwpRate(base44);
  // Account-scoped: only the active account space's holdings / cash /
  // snapshots are aggregated. JS-side filtering — reliable under RLS.
  const [allHoldings, allCash, allRecent] = await Promise.all([
    base44.entities.Holding.list("-created_date", 200),
    base44.entities.CashAccount.list("-created_date", 10),
    base44.entities.PortfolioSnapshot.list("-created_date", 50),
  ]);
  const holdings = allHoldings.filter((h) => (h.account_type || 'demo') === acct);
  const cashAccounts = allCash.filter((c) => (c.account_type || 'demo') === acct);
  const recent = allRecent.filter((s) => (s.account_type || 'demo') === acct);
  const invested = holdings.reduce((s, h) => {
    const price = Number(h.current_price) || Number(h.avg_cost) || 0;
    const cur = h.currency || 'BWP';
    return s + nativeToBwp((Number(h.units) || 0) * price, cur, rate);
  }, 0);
  const cost = holdings.reduce((s, h) => {
    const prevBwp = Number(h.avg_cost_bwp);
    const unitBwp = Number.isFinite(prevBwp) && prevBwp > 0
      ? prevBwp
      : nativeToBwp(Number(h.avg_cost) || 0, h.currency || 'BWP', rate);
    return s + (Number(h.units) || 0) * unitBwp;
  }, 0);
  const cash = Number(cashAccounts[0]?.balance || 0);
  const total = invested + cash;
  const pl = invested - cost;
  const date = new Date().toISOString().slice(0, 10);
  // recent is already scoped to the caller by RLS, so match today's snapshot
  // by date only.
  const todays = recent.find((s) => String(s.date || '').slice(0, 10) === date);
  if (todays) {
    return base44.entities.PortfolioSnapshot.update(todays.id, {
      total_value: total, invested_value: invested, cash_value: cash, pl,
    });
  }
  return base44.entities.PortfolioSnapshot.create({
    date, total_value: total, invested_value: invested, cash_value: cash, pl,
    account_type: acct,
    created_by_id: userId,
  });
}
