import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import ChangeBadge from "@/components/common/ChangeBadge";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatMoney, nativeToBwp, useUsdBwpRate } from "@/lib/currency";
import { cn } from "@/lib/utils";
export default function HoldingRow({ holding }) {
  const rate = useUsdBwpRate();
  const currency = holding.currency || "BWP";
  const isForeign = currency !== "BWP";
  const nativeValue = (holding.units || 0) * (holding.current_price || 0);
  const marketValueBwp = nativeToBwp(nativeValue, currency, rate);
  const costBwpUnit = (holding.avg_cost_bwp && holding.avg_cost_bwp > 0)
    ? holding.avg_cost_bwp
    : nativeToBwp(holding.avg_cost || 0, currency, rate);
  const cost = (holding.units || 0) * costBwpUnit;
  const pl = marketValueBwp - cost;
  const plPercent = cost > 0 ? (pl / cost) * 100 : 0;
  return (
    <Link to={`/investment/${holding.investment_id || ""}`} className="block">
      <Card className="p-4 shadow-card border-border/70 transition-shadow hover:shadow-card-hover">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary font-semibold text-xs shrink-0">
              {holding.ticker.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{holding.ticker}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{currency}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">{holding.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-sm tabular-nums">
              {isForeign ? formatMoney(nativeValue, currency) : formatCurrency(marketValueBwp)}
            </div>
            <div className="text-xs text-muted-foreground">
              {isForeign ? `≈ ${formatCurrency(marketValueBwp)}` : `${formatNumber(holding.units)} units`}
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <ChangeBadge value={plPercent} />
            <div className={cn("mt-1 text-xs font-medium tabular-nums", pl >= 0 ? "text-success" : "text-destructive")}>
              {pl >= 0 ? "+" : ""}{formatCurrency(pl)}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
