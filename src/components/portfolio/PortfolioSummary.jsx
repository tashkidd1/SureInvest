import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, PiggyBank, Percent } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import PortfolioChart from "@/components/charts/PortfolioChart";
import { formatCurrency } from "@/lib/format";

export default function PortfolioSummary({ totalValue, invested, cash, pl, plPercent, history = [], isDemo = false }) {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-border/70 shadow-card">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Portfolio value</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{formatCurrency(totalValue)}</h2>
              <span className={pl >= 0 ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>
                {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({plPercent >= 0 ? "+" : ""}{Number(plPercent || 0).toFixed(2)}%)
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Total account value including investments and available cash</p>
          </div>
          {isDemo && (
            <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              Simulated account
            </span>
          )}
        </div>
        {history.length > 0 ? (
          <div className="border-t border-border/70 px-3 pb-4 pt-3 sm:px-5 sm:pb-5">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-xs font-medium text-muted-foreground">Portfolio history · last 30 days</p>
            </div>
            <PortfolioChart data={history} />
          </div>
        ) : (
          <div className="border-t border-dashed border-border/70 px-5 py-8 text-sm text-muted-foreground">
            Your performance history will appear here as your portfolio activity builds.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Invested" value={formatCurrency(invested)} icon={TrendingUp} />
        <StatCard label="Cash available" value={formatCurrency(cash)} icon={PiggyBank} tone="soft" />
        <StatCard label="Total return" value={`${pl >= 0 ? "+" : ""}${formatCurrency(pl)}`} icon={Percent} tone="accent" change={plPercent} className="col-span-2 lg:col-span-1" />
      </div>
    </div>
  );
}
