import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, PiggyBank, Percent } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import PortfolioChart from "@/components/charts/PortfolioChart";
import { formatCurrency, formatPercent } from "@/lib/format";
export default function PortfolioSummary({ totalValue, invested, cash, pl, plPercent, history = [] }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Portfolio" value={formatCurrency(totalValue)} icon={Wallet} tone="primary" change={plPercent} changeLabel="all time" />
        <StatCard label="Invested" value={formatCurrency(invested)} icon={TrendingUp} />
        <StatCard label="Cash Available" value={formatCurrency(cash)} icon={PiggyBank} tone="soft" />
        <StatCard label="Total Return" value={`${pl >= 0 ? "+" : ""}${formatCurrency(pl)}`} icon={Percent} tone="accent" change={plPercent} />
      </div>
      {history.length > 0 && (
        <Card className="p-5 shadow-card border-border/70">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Portfolio value</h3>
              <p className="text-xs text-muted-foreground">Simulated performance · last 30 days</p>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">Demo data</span>
          </div>
          <div className="mt-4">
            <PortfolioChart data={history} />
          </div>
        </Card>
      )}
    </div>
  );
}
