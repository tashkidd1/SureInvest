import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/AccountContext";
import { qk } from "@/lib/queries";
// Granular, user-scoped entity queries. Each is keyed by the authenticated
// user id so cache entries are isolated per account and invalidated together
// after mutations (see src/lib/queries.js).
function useUid() {
  const { user } = useAuth();
  return user?.id || null;
}
// Active account space (demo/real) from the account switcher. Records are
// filtered on this so every view only shows the active account's data.
function useAcct() {
  const { accountType } = useAccount();
  return accountType || "demo";
}
const inAccount = (record, acct) => (record.account_type || "demo") === acct;
export function useCash() {
  const uid = useUid();
  const acct = useAcct();
  return useQuery({
    queryKey: [...qk.cash(uid), acct],
    queryFn: async () => {
      const list = await base44.entities.CashAccount.list("-created_date", 10);
      return list.find((c) => inAccount(c, acct)) || null;
    },
    enabled: !!uid,
  });
}
export function useHoldings() {
  const uid = useUid();
  const acct = useAcct();
  return useQuery({
    queryKey: [...qk.holdings(uid), acct],
    queryFn: async () =>
      (await base44.entities.Holding.list("-created_date", 200)).filter((h) => inAccount(h, acct)),
    enabled: !!uid,
  });
}
export function useTransactions(limit = 100) {
  const uid = useUid();
  const acct = useAcct();
  return useQuery({
    queryKey: [...qk.transactions(uid), acct],
    queryFn: async () =>
      (await base44.entities.Transaction.list("-created_date", limit)).filter((t) => inAccount(t, acct)),
    enabled: !!uid,
  });
}
export function useNotifications(limit = 50) {
  const uid = useUid();
  return useQuery({
    queryKey: qk.notifications(uid),
    queryFn: () => base44.entities.Notification.list("-created_date", limit),
    enabled: !!uid,
  });
}
export function useGoals() {
  const uid = useUid();
  const acct = useAcct();
  return useQuery({
    queryKey: [...qk.goals(uid), acct],
    queryFn: async () =>
      (await base44.entities.Goal.list("-created_date", 50)).filter((g) => inAccount(g, acct)),
    enabled: !!uid,
  });
}
export function useSnapshots() {
  const uid = useUid();
  const acct = useAcct();
  return useQuery({
    queryKey: [...qk.snapshots(uid), acct],
    queryFn: async () =>
      (await base44.entities.PortfolioSnapshot.list("-date", 60)).filter((s) => inAccount(s, acct)),
    enabled: !!uid,
  });
}
// Shared catalogue — not user-scoped (read is open to all).
export function useInvestments() {
  return useQuery({
    queryKey: qk.investments(),
    queryFn: () => base44.entities.Investment.list("-daily_change_percent", 200),
  });
}
export function useInvestment(id) {
  return useQuery({
    queryKey: qk.investment(id),
    queryFn: () => base44.entities.Investment.get(id),
    enabled: !!id,
  });
}
export function useProfile() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.profile(uid),
    queryFn: async () => (await base44.entities.Profile.list("-created_date", 5))[0] || null,
    enabled: !!uid,
  });
}
// Display-name resolution: Profile.display_name → User.full_name → email → "Investor".
export function useDisplayName() {
  const { user } = useAuth();
  const profile = useProfile();
  return profile.data?.display_name || user?.full_name || user?.email || "Investor";
}
