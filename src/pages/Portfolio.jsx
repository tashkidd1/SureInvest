import { usePortfolio } from "@/hooks/usePortfolio";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import HoldingRow from "@/components/portfolio/HoldingRow";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { Briefcase, PieChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { nativeToBwp, useUsdBwpRate } from "@/lib/currency";
export default function Portfolio() {
  const portfolio = usePortfolio();
  // Hooks must run unconditionally — call before any early return.
  const rate = useUsdBwpRate();
  if (portfolio.loading) {
    return (
      <div className="grid place-items-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }
  // Sector allocation on a consistent BWP basis (foreign holdings converted
  // via the cached USD/BWP rate) so percentages match the portfolio totals.
  const bySector = portfolio.holdings.reduce((acc, h) => {
    const val = nativeToBwp((h.units || 0) * (h.current_price || h.avg_cost || 0), h.currency, rate);
    acc[h.sector || "Other"] = (acc[h.sector || "Other"] || 0) + val;
    return acc;
  }, {});
  const totalInvested = Object.values(bySector).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-6">
      <PageHeader title="Portfolio" subtitle="Your simulated holdings and performance." icon={Briefcase} />
      <PortfolioSummary
        totalValue={portfolio.totalValue}
        invested={portfolio.invested}
        cash={portfolio.cash}
        pl={portfolio.pl}
        plPercent={portfolio.plPercent}
        history={portfolio.snapshots}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-3">
          <h2 className="font-display text-lg font-semibold">Holdings</h2>
          {portfolio.holdings.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">No holdings yet. Head to Markets to make your first simulated trade.</Card>
          ) : (
            portfolio.holdings.map((h) => <HoldingRow key={h.id} holding={h} />)
          )}
        </section>
        <aside className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Allocation</h2>
          <Card className="p-5 shadow-card border-border/70">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PieChart className="h-4 w-4" /> By sector
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(bySector).map(([sector, val]) => {
                const pct = Math.round((val / totalInvested) * 100);
                return (
                  <div key={sector}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{sector}</span>
                      <span className="text-muted-foreground tabular-nums">{pct}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(bySector).length === 0 && <p className="text-sm text-muted-foreground">No holdings to allocate.</p>}
            </div>
          </Card>
          <Disclaimer />
        </aside>
      </div>
    </div>
  );
}
