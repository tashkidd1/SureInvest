import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import InvestmentCard from "@/components/investments/InvestmentCard";
import Disclaimer from "@/components/common/Disclaimer";
import { LineChart, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useInvestments } from "@/hooks/useEntityQueries";
import RefreshMarketDataButton from "@/components/markets/RefreshMarketDataButton";
import RefreshFundamentalsButton from "@/components/markets/RefreshFundamentalsButton";
import BseIndexCard from "@/components/markets/BseIndexCard";
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
const PERFORMANCE_FILTERS = [
  { key: "All", label: "All" },
  { key: "gainers", label: "Up 5%+" },
  { key: "losers", label: "Down 5%+" },
  { key: "flat", label: "Flat (±1%)" },
];
export default function Markets() {
  const wl = useWatchlist();
  const { data: investments = [], isLoading: loading } = useInvestments();
  const [market, setMarket] = useState("botswana");
  const [asset, setAsset] = useState("All");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [performance, setPerformance] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("market");
    if (m === "botswana" || m === "global") setMarket(m);
  }, []);
  // Sector options are scoped to the current market — a BSE-only sector
  // ("Mining") shouldn't clutter the dropdown while viewing Global.
  const sectorOptions = useMemo(() => {
    const set = new Set(
      investments.filter((i) => i.market === market && i.sector).map((i) => i.sector)
    );
    return ["All", ...Array.from(set).sort()];
  }, [investments, market]);
  // Reset a sector selection that no longer applies after switching markets.
  useEffect(() => {
    if (sector !== "All" && !sectorOptions.includes(sector)) setSector("All");
  }, [sectorOptions, sector]);
  const filtered = investments.filter((inv) => {
    if (inv.market !== market) return false;
    if (asset !== "All" && inv.category !== asset) return false;
    if (sector !== "All" && inv.sector !== sector) return false;
    if (query && !`${inv.ticker} ${inv.name}`.toLowerCase().includes(query.toLowerCase())) return false;
    const price = Number(inv.price);
    if (minPrice !== "" && !(price >= Number(minPrice))) return false;
    if (maxPrice !== "" && !(price <= Number(maxPrice))) return false;
    const pct = Number(inv.daily_change_percent) || 0;
    if (performance === "gainers" && !(pct >= 5)) return false;
    if (performance === "losers" && !(pct <= -5)) return false;
    if (performance === "flat" && !(pct >= -1 && pct <= 1)) return false;
    return true;
  });
  const activeFilterCount =
    (sector !== "All" ? 1 : 0) + (performance !== "All" ? 1 : 0) + (minPrice !== "" ? 1 : 0) + (maxPrice !== "" ? 1 : 0);
  const clearFilters = () => {
    setSector("All");
    setPerformance("All");
    setMinPrice("");
    setMaxPrice("");
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Markets"
          subtitle="A curated universe of Botswana and global securities. Prices are simulated for practice, not live market quotes."
          icon={LineChart}
        />
        <div className="shrink-0 sm:pt-1">
          <div className="flex flex-wrap gap-2">
          <RefreshMarketDataButton />
          <RefreshFundamentalsButton />
        </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or name…"
          className="h-10 w-full rounded-lg border border-input bg-card px-3.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 sm:max-w-xs"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors",
            showFilters || activeFilterCount > 0
              ? "border-primary bg-primary-soft text-primary"
              : "border-input bg-card text-muted-foreground hover:border-primary/40"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
      {showFilters && (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Sector</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Performance</label>
            <select
              value={performance}
              onChange={(e) => setPerformance(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {PERFORMANCE_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Min price</label>
            <input
              type="number" min="0" placeholder="0" value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Max price</label>
            <input
              type="number" min="0" placeholder="Any" value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive sm:col-span-4 sm:justify-self-start"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
      )}
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
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {ASSET_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setAsset(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              asset === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {market === "botswana" && <BseIndexCard />}
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
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No instruments match your filters.</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or switching between Botswana and Global.</p>
        </div>
      )}
      <Disclaimer />
      <p className="text-[11px] text-muted-foreground">
        BSE market data via Mansa (mansaapi.com) · Global market data via Twelve Data.
      </p>
    </div>
  );
}
