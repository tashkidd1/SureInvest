import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import InvestmentCard from "@/components/investments/InvestmentCard";
import Disclaimer from "@/components/common/Disclaimer";
import { LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useInvestments } from "@/hooks/useEntityQueries";
import RefreshMarketDataButton from "@/components/markets/RefreshMarketDataButton";
const MARKETS = [
  { key: "botswana", label: "Botswana" },
  { key: "global", label: "Global" },
];
const ASSET_FILTERS = [
  { key: "All", label: "All" },
  { key: "equity", label: "Stocks" },
  { key: "etf", label: "ETFs" },
  { key: "reit", label: "REIT / Real Estate" },
  { key: "digital", label: "Digital Assets" },
  { key: "bond", label: "Bonds" },
];
export default function Markets() {
  const wl = useWatchlist();
  const { data: investments = [], isLoading: loading } = useInvestments();
  const [market, setMarket] = useState("botswana");
  const [asset, setAsset] = useState("All");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("market");
    if (m === "botswana" || m === "global") setMarket(m);
  }, []);
  const filtered = investments.filter((inv) => {
    if (inv.market !== market) return false;
    if (asset !== "All" && inv.category !== asset) return false;
    if (query && !`${inv.ticker} ${inv.name}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const lastUpdated = investments.length ? investments.map((i) => i.last_updated).filter(Boolean).sort().reverse()[0] : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Markets"
          subtitle="A curated universe of Botswana and global securities. All prices are clearly-labelled demo data — not live market quotes."
          icon={LineChart}
        />
        <RefreshMarketDataButton />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or name…"
          className="h-10 w-full rounded-lg border border-input bg-card px-3.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 sm:max-w-xs"
        />
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">Prices last updated {formatDate(lastUpdated, { withTime: true })}</p>
        )}
      </div>
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {MARKETS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMarket(m.key)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              market === m.key ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {ASSET_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setAsset(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              asset === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="grid place-items-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inv) => <InvestmentCard key={inv.id} investment={inv} onWatch={wl.toggle} watched={wl.isWatched(inv)} pending={wl.isPending(inv)} />)}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">No instruments match your filters.</p>
      )}
      <Disclaimer />
      <p className="text-[11px] text-muted-foreground">
        BSE market data via Mansa (mansaapi.com) · Global market data via Twelve Data.
      </p>
    </div>
  );
}
