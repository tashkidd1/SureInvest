import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import ChangeBadge from "@/components/common/ChangeBadge";
import TradeModal from "@/components/trades/TradeModal";
import { LineChart } from "@/components/charts/PriceChart";
import Disclaimer from "@/components/common/Disclaimer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatNumber, formatDate, changeTone } from "@/lib/format";
import { formatMoney, nativeToBwp, useUsdBwpRate } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useInvestment, useHoldings, useCash } from "@/hooks/useEntityQueries";
export default function InvestmentDetail() {
  const { id } = useParams();
  const rate = useUsdBwpRate();
  const wl = useWatchlist();
  const [trade, setTrade] = useState(null); // { mode }
  const invQ = useInvestment(id);
  const holdingsQ = useHoldings();
  const cashQ = useCash();
  const inv = invQ.data;
  const holdings = holdingsQ.data || [];
  const cash = cashQ.data?.balance || 0;
  const loading = invQ.isLoading || holdingsQ.isLoading;
  if (loading) {
    return <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }
  if (!inv) {
    return (
      <div className="space-y-6">
        <Link to="/markets" className="inline-flex items-center text-sm text-primary hover:underline"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to markets</Link>
        <Card className="p-8 text-center text-sm text-muted-foreground">Investment not found.</Card>
      </div>
    );
  }
  // Position is matched by the real relationship: Holding.investment_id ===
  // Investment.id. A ticker fallback covers any legacy holding missing the id.
  const holding = holdings.find((h) => h.investment_id === id) || holdings.find((h) => h.ticker === inv.ticker) || null;
  const change = inv.daily_change_percent ?? 0;
  const tone = changeTone(change);
  const sourceLabel = inv.data_source === "twelve_data" ? "Twelve Data" : "Seeded demo data";
  const currency = inv.currency || "BWP";
  const isForeign = currency !== "BWP";
  const bwpPrice = nativeToBwp(inv.price, currency, rate);
  const bwpDailyChange = nativeToBwp(inv.daily_change || 0, currency, rate);
  return (
    <div className="space-y-6">
      <Link to="/markets" className="inline-flex items-center text-sm text-primary hover:underline"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to markets</Link>
      <PageHeader title={inv.name} subtitle={`${inv.ticker} · ${inv.market === "botswana" ? "Botswana" : "Global"} · ${inv.exchange}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-6">
          <Card className="p-6 shadow-card border-border/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-display text-4xl font-bold tabular-nums">{formatMoney(inv.price, currency)}</div>
                {isForeign && (
                  <div className="mt-1 text-sm text-muted-foreground tabular-nums">≈ {formatCurrency(bwpPrice)} BWP</div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <ChangeBadge value={change} />
                  <span className="text-sm text-muted-foreground">{change > 0 ? "+" : ""}{formatMoney(inv.daily_change || 0, currency)} today{isForeign ? ` · ≈ ${formatCurrency(bwpDailyChange)}` : ""}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => wl.toggle(inv)} disabled={wl.isPending(inv)} aria-label={wl.isWatched(inv) ? "Remove from watchlist" : "Add to watchlist"}>
                  <Star className={cn("h-4 w-4", wl.isWatched(inv) && "fill-warning text-warning")} />
                </Button>
                <Button onClick={() => setTrade({ mode: "buy" })}><TrendingUp className="mr-1.5 h-4 w-4" /> Buy</Button>
                {holding && (
                  <Button variant="outline" onClick={() => setTrade({ mode: "sell" })} className="text-destructive hover:text-destructive">
                    <TrendingDown className="mr-1.5 h-4 w-4" /> Sell
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>30-day price history</span>
                <span className="rounded-full bg-muted px-2 py-0.5">{sourceLabel}</span>
              </div>
              <div className="mt-3 h-56">
                <LineChart data={inv.historical_prices || []} tone={tone} />
              </div>
            </div>
          </Card>
          <Card className="p-6 shadow-card border-border/70">
            <h3 className="font-display font-semibold">About {inv.ticker}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{inv.description || "No description available."}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Metric label="Sector" value={inv.sector || "—"} />
              <Metric label="Asset type" value={inv.category} />
              <Metric label="Market cap" value={inv.market_cap ? formatMoney(inv.market_cap, currency, { compact: true }) : "—"} />
              <Metric label="P/E ratio" value={inv.pe_ratio ? inv.pe_ratio : "—"} />
              <Metric label="Dividend yield" value={inv.dividend_yield ? `${inv.dividend_yield}%` : "None"} />
              <Metric label="Frequency" value={inv.dividend_frequency} />
            </div>
          </Card>
        </section>
        <aside className="space-y-4">
          <Card className="p-5 shadow-card border-border/70">
            <h3 className="font-display font-semibold">Your position</h3>
            {holding ? (() => {
              const hcur = holding.currency || currency;
              const nativeValue = (holding.units || 0) * (inv.price || 0);
              const valueBwp = nativeToBwp(nativeValue, hcur, rate);
              const costBwpUnit = (holding.avg_cost_bwp && holding.avg_cost_bwp > 0)
                ? holding.avg_cost_bwp
                : nativeToBwp(holding.avg_cost || 0, hcur, rate);
              const costBwp = (holding.units || 0) * costBwpUnit;
              const plBwp = valueBwp - costBwp;
              const plPositive = plBwp > 0;
              return (
                <div className="mt-3 space-y-2 text-sm">
                  <Row label="Units held" value={formatNumber(holding.units)} />
                  <Row label="Avg. cost" value={hcur === "BWP" ? formatCurrency(holding.avg_cost) : `${formatMoney(holding.avg_cost, hcur)} · ≈ ${formatCurrency(costBwpUnit)}`} />
                  <Row label="Current value" value={hcur === "BWP" ? formatCurrency(valueBwp) : `${formatMoney(nativeValue, hcur)} · ≈ ${formatCurrency(valueBwp)}`} />
                  <div className="border-t border-border pt-2">
                    <Row label="P/L (BWP)" value={`${plPositive ? "+" : plBwp < 0 ? "-" : ""}${formatCurrency(Math.abs(plBwp))}`} tone={changeTone(plBwp)} />
                  </div>
                </div>
              );
            })() : (
              <p className="mt-3 text-sm text-muted-foreground">You don't hold this investment yet. Buy some to add it to your portfolio.</p>
            )}
          </Card>
          <Card className="p-5 shadow-card border-border/70">
            <h3 className="font-display font-semibold">Data & pricing</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Source" value={sourceLabel} />
              <Row label="Last updated" value={inv.last_updated ? formatDate(inv.last_updated, { withTime: true }) : "—"} />
              <Row label="Cash available" value={formatCurrency(cash)} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {inv.data_source === "twelve_data" ? "Prices sourced from Twelve Data and cached locally." : "Prices are simulated demo data, not live market quotes."}
            </p>
          </Card>
          <Disclaimer />
        </aside>
      </div>
      <TradeModal
        open={!!trade}
        onOpenChange={(o) => !o && setTrade(null)}
        investment={inv}
        mode={trade?.mode || "buy"}
        holding={holding}
        cashBalance={cash}
      />
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground capitalize">{label}</div>
      <div className="mt-0.5 font-medium capitalize">{value || "—"}</div>
    </div>
  );
}
function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", tone === "positive" && "text-success", tone === "negative" && "text-destructive")}>{value}</span>
    </div>
  );
}
