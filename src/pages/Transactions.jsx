import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { Receipt, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Coins, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTransactions } from "@/hooks/useEntityQueries";
// Friendly label + tone per transaction type. Goal contributions are shown as
// "Goal Contribution" (type goal_contribution), not a generic withdrawal.
const TYPE_META = {
  buy: { icon: TrendingUp, tone: "bg-success/12 text-success", label: "Buy" },
  sell: { icon: TrendingDown, tone: "bg-destructive/12 text-destructive", label: "Sell" },
  deposit: { icon: ArrowDownLeft, tone: "bg-accent/12 text-accent", label: "Starting Balance" },
  withdrawal: { icon: ArrowUpRight, tone: "bg-muted text-muted-foreground", label: "Withdrawal" },
  goal_contribution: { icon: Target, tone: "bg-accent/12 text-accent", label: "Goal Contribution" },
  dividend: { icon: Coins, tone: "bg-warning/15 text-warning", label: "Dividend" },
  fee: { icon: Receipt, tone: "bg-muted text-muted-foreground", label: "Fee" },
};
export default function Transactions() {
  const q = useTransactions();
  const txs = q.data || [];
  const loading = q.isLoading;
  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" subtitle="A full history of your simulated account activity." icon={Receipt} />
      {loading ? (
        <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : txs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</Card>
      ) : (
        <Card className="divide-y divide-border shadow-card border-border/70">
          {txs.map((tx) => {
            const meta = TYPE_META[tx.type] || { ...TYPE_META.fee, label: tx.type };
            const Icon = meta.icon;
            return (
              <div key={tx.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-full", meta.tone)}><Icon className="h-4 w-4" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{meta.label} {tx.ticker ? `· ${tx.ticker}` : ""}</span>
                      {tx.legacy && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground" title="Pre-multi-currency trade restated to BWP">legacy</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{tx.description || formatDate(tx.created_date, { withTime: true })}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(tx.created_date, { withTime: true })}</div>
                  </div>
                </div>
                <span className={cn("font-semibold tabular-nums", tx.amount >= 0 ? "text-success" : "text-foreground")}>
                  {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                </span>
              </div>
            );
          })}
        </Card>
      )}
      <Disclaimer />
    </div>
  );
}
