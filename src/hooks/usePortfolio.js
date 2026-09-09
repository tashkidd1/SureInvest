import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/AccountContext";
import { getUsdBwpRate, nativeToBwp, FALLBACK_USD_BWP } from "@/lib/currency";
import { qk } from "@/lib/queries";
const EMPTY = {
  holdings: [], investments: [], priceMap: {}, cash: 0, cashAccount: null,
  transactions: [], goals: [], watchlist: [], dividends: [], notifications: [],
  snapshots: [], rate: FALLBACK_USD_BWP, invested: 0, totalValue: 0, pl: 0, plPercent: 0,
};
// Aggregates the current user's portfolio (holdings + cash + transactions +
// goals + watchlist + dividends + notifications + snapshots) and the cached
// investment catalogue into one object, all on a BWP basis. Backed by React
// Query keyed to the user id so it refetches automatically when invalidated by
// a trade / goal contribution / watchlist change. Duplicate legacy holdings
// for the same investment are collapsed (units summed, weighted-average cost
// recomputed) so portfolio value is never double-counted.
export function usePortfolio() {
  const { user } = useAuth();
  const uid = user?.id || null;
  const { accountType } = useAccount();
  const acct = accountType || "demo";
  const q = useQuery({
    queryKey: [...qk.portfolio(uid), acct],
    enabled: !!uid,
    queryFn: async () => {
      const rate = await getUsdBwpRate();
      const [holdings, investments, cashAccounts, transactions, goals, watchlist, dividends, notifications, snapshots] = await Promise.all([
        base44.entities.Holding.list("-created_date", 100),
        base44.entities.Investment.list("-daily_change_percent", 200),
        base44.entities.CashAccount.list("-created_date", 10),
        base44.entities.Transaction.list("-created_date", 100),
        base44.entities.Goal.list("-created_date", 50),
        base44.entities.Watchlist.list("-created_date", 50),
        base44.entities.Dividend.list("-pay_date", 50),
        base44.entities.Notification.list("-created_date", 50),
        base44.entities.PortfolioSnapshot.list("-date", 60),
      ]);
      // Account-scoped: only the active account space's records are used.
      const inAcct = (r) => (r.account_type || "demo") === acct;
      const sh = holdings.filter(inAcct);
      const sc = cashAccounts.filter(inAcct);
      const st = transactions.filter(inAcct);
      const sg = goals.filter(inAcct);
      const ss = snapshots.filter(inAcct);
      const invById = {};
      const invByTicker = {};
      investments.forEach((i) => { invById[i.id] = i; invByTicker[i.ticker] = i; });
      // Collapse duplicate holdings (same investment_id, or ticker fallback)
      // into a single position per investment.
      const dedup = {};
      const order = [];
      sh.forEach((h) => {
        const inv = invById[h.investment_id] || invByTicker[h.ticker];
        const key = h.investment_id || `t:${h.ticker}`;
        const currency = h.currency || inv?.currency || "BWP";
        const current_price = inv?.price ?? h.current_price ?? h.avg_cost;
        if (dedup[key]) {
          const prev = dedup[key];
          const u0 = Number(prev.units) || 0;
          const u1 = Number(h.units) || 0;
          const nu = u0 + u1;
          const costN0 = u0 * (Number(prev.avg_cost) || 0);
          const costN1 = u1 * (Number(h.avg_cost) || 0);
          const ub0 = Number(prev.avg_cost_bwp);
          const unitBwp0 = Number.isFinite(ub0) && ub0 > 0 ? ub0 : nativeToBwp(Number(prev.avg_cost) || 0, prev.currency || currency, rate);
          const ub1 = Number(h.avg_cost_bwp);
          const unitBwp1 = Number.isFinite(ub1) && ub1 > 0 ? ub1 : nativeToBwp(Number(h.avg_cost) || 0, h.currency || currency, rate);
          prev.units = nu;
          prev.avg_cost = nu > 0 ? (costN0 + costN1) / nu : 0;
          prev.avg_cost_bwp = nu > 0 ? (u0 * unitBwp0 + u1 * unitBwp1) / nu : 0;
          prev.current_price = current_price;
          prev.currency = currency;
        } else {
          dedup[key] = { ...h, currency, current_price, units: Number(h.units) || 0 };
          order.push(key);
        }
      });
      const resolvedHoldings = order.map((k) => dedup[k]);
      const invested = resolvedHoldings.reduce(
        (s, h) => s + nativeToBwp((h.units || 0) * (h.current_price || 0), h.currency, rate), 0
      );
      const cost = resolvedHoldings.reduce((s, h) => {
        const cBwp = Number(h.avg_cost_bwp);
        const unitBwp = Number.isFinite(cBwp) && cBwp > 0 ? cBwp : nativeToBwp(h.avg_cost || 0, h.currency, rate);
        return s + (h.units || 0) * unitBwp;
      }, 0);
      const pl = invested - cost;
      const plPercent = cost > 0 ? (pl / cost) * 100 : 0;
      const cash = sc[0]?.balance ?? 0;
      return {
        holdings: resolvedHoldings, investments, priceMap: Object.fromEntries(investments.map((i) => [i.ticker, i.price])),
        cash, cashAccount: sc[0] || null, transactions: st, goals: sg, watchlist, dividends, notifications, snapshots: ss,
        rate, invested, totalValue: invested + cash, pl, plPercent, loading: false,
      };
    },
  });
  const data = q.data || EMPTY;
  return { ...data, loading: q.isLoading, error: q.error?.message, reload: () => q.refetch() };
}
export default usePortfolio;
