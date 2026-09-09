import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { qk, invalidateWatchlist } from "@/lib/queries";
// Single source of truth for watchlist state, backed by React Query
// (["watchlist", user.id]). The toggle calls the idempotent backend function
// then invalidates the cache so every consumer (Markets, Investment Detail,
// Watchlist page) stays in sync. Removing an already-removed item is safe —
// the backend toggle is idempotent and never surfaces a raw "not found" error.
export function useWatchlist() {
  const { user } = useAuth();
  const uid = user?.id || null;
  const qc = useQueryClient();
  const [pending, setPending] = useState({});
  const q = useQuery({
    queryKey: qk.watchlist(uid),
    enabled: !!uid,
    queryFn: () => base44.entities.Watchlist.list("-created_date", 200),
  });
  const items = q.data || [];
  const byId = new Map(items.map((i) => [i.investment_id || `t:${i.ticker}`, i]));
  const isWatched = useCallback(
    (inv) => !!byId.get(inv?.investment_id || inv?.id || `t:${inv?.ticker}`),
    [items]
  );
  const isPending = useCallback((inv) => !!pending[inv?.investment_id || inv?.id || `t:${inv?.ticker}`], [pending]);
  const toggle = useCallback(async (inv) => {
    const key = inv?.investment_id || inv?.id || `t:${inv?.ticker}`;
    setPending((p) => ({ ...p, [key]: true }));
    try {
      const res = await base44.functions.invoke("toggleWatchlist", {
        investment_id: inv?.investment_id || inv?.id,
      });
      await invalidateWatchlist(qc, uid);
      return res?.data || {};
    } finally {
      setPending((p) => { const next = { ...p }; delete next[key]; return next; });
    }
  }, [qc, uid]);
  return { items, loading: q.isLoading, isWatched, toggle, isPending };
}
export default useWatchlist;
