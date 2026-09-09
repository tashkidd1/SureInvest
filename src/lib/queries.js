// Central React Query key factory + invalidation helpers. Query keys are scoped
// to the authenticated user id so cached data never leaks between accounts.
// Mutations invalidate the keys that depend on them so the UI refreshes
// everywhere without a manual page reload.
export const qk = {
  cash: (uid) => ["cash", uid],
  holdings: (uid) => ["holdings", uid],
  transactions: (uid) => ["transactions", uid],
  notifications: (uid) => ["notifications", uid],
  goals: (uid) => ["goals", uid],
  watchlist: (uid) => ["watchlist", uid],
  snapshots: (uid) => ["snapshots", uid],
  portfolio: (uid) => ["portfolio", uid],
  profile: (uid) => ["profile", uid],
  investments: () => ["investments"],
  investment: (id) => ["investment", id],
  exchangeRate: () => ["exchangeRate"],
};
// After a BUY/SELL: cash, holdings, transactions, notifications, snapshots and
// the aggregated portfolio all change.
export function invalidateTrade(qc, uid) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["cash", uid] }),
    qc.invalidateQueries({ queryKey: ["holdings", uid] }),
    qc.invalidateQueries({ queryKey: ["transactions", uid] }),
    qc.invalidateQueries({ queryKey: ["notifications", uid] }),
    qc.invalidateQueries({ queryKey: ["snapshots", uid] }),
    qc.invalidateQueries({ queryKey: ["portfolio", uid] }),
  ]);
}
// After a goal contribution: cash, goals, transactions, notifications,
// snapshots and the aggregated portfolio all change.
export function invalidateGoal(qc, uid) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["cash", uid] }),
    qc.invalidateQueries({ queryKey: ["goals", uid] }),
    qc.invalidateQueries({ queryKey: ["transactions", uid] }),
    qc.invalidateQueries({ queryKey: ["notifications", uid] }),
    qc.invalidateQueries({ queryKey: ["snapshots", uid] }),
    qc.invalidateQueries({ queryKey: ["portfolio", uid] }),
  ]);
}
// After a watchlist change: watchlist + portfolio (which embeds watchlist).
export function invalidateWatchlist(qc, uid) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["watchlist", uid] }),
    qc.invalidateQueries({ queryKey: ["portfolio", uid] }),
  ]);
}
// After a cash top-up / manual cash+deposit. Top-ups now create a persistent
// notification, so the notifications list is invalidated too.
export function invalidateCash(qc, uid) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["cash", uid] }),
    qc.invalidateQueries({ queryKey: ["transactions", uid] }),
    qc.invalidateQueries({ queryKey: ["notifications", uid] }),
    qc.invalidateQueries({ queryKey: ["portfolio", uid] }),
    qc.invalidateQueries({ queryKey: ["snapshots", uid] }),
  ]);
}
// After an admin-triggered market-data refresh: the shared investments
// catalogue, every cached per-investment detail, the USD/BWP rate and the
// aggregated portfolio (which values holdings from investment prices) all
// pick up the new prices. Nothing else changes, so nothing else is cleared.
export function invalidateMarketData(qc, uid) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["investments"] }),
    qc.invalidateQueries({ queryKey: ["investment"] }),
    qc.invalidateQueries({ queryKey: ["exchangeRate"] }),
    qc.invalidateQueries({ queryKey: ["portfolio", uid] }),
  ]);
}
