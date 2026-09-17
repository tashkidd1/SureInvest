import { Link } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import ChangeBadge from "@/components/common/ChangeBadge";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency";
import { useWatchlist } from "@/hooks/useWatchlist";
// The Watchlist page reads from the single shared useWatchlist source of
// truth (React Query cache). Removal goes through the same idempotent toggle
// used everywhere else, so removing an already-removed item never surfaces a
// raw "not found" error.
export default function Watchlist() {
  const wl = useWatchlist();
  const items = wl.items;
  const loading = wl.loading;
  const remove = (it) => wl.toggle({ investment_id: it.investment_id, id: it.investment_id, ticker: it.ticker });
  return (
    <div className="space-y-6">
      <PageHeader title="Watchlist" subtitle="Securities you're keeping an eye on." icon={Star} />
      {loading ? (
        <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">Your watchlist is empty. Star securities on the Markets page to track them here.</p>
          <Link to="/markets"><Button size="sm" variant="outline">Browse markets</Button></Link>
        </Card>
      ) : (
        <Card className="divide-y divide-border shadow-card border-border/70">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary font-semibold text-xs">{it.ticker.slice(0, 2)}</div>
                <div>
                  <div className="font-semibold text-sm">{it.ticker}</div>
                  <div className="text-xs text-muted-foreground">{it.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold tabular-nums">{formatMoney(it.price, it.market === "global" ? "USD" : "BWP")}</span>
                <ChangeBadge value={it.daily_change_percent || 0} />
                <button onClick={() => remove(it)} disabled={wl.isPending({ investment_id: it.investment_id })} className="text-muted-foreground hover:text-destructive text-xs font-medium disabled:opacity-50">Remove</button>
              </div>
            </div>
          ))}
        </Card>
      )}
      <Disclaimer />
    </div>
  );
}
