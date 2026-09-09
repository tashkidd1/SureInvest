import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import ChangeBadge from "@/components/common/ChangeBadge";
import { formatCurrency } from "@/lib/format";
import { formatMoney, nativeToBwp, useUsdBwpRate } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
const CATEGORY_TONE = {
  equity: "bg-primary-soft text-primary",
  etf: "bg-accent-soft text-accent",
  reit: "bg-warning/15 text-warning",
  bond: "bg-muted text-muted-foreground",
  cash: "bg-muted text-muted-foreground",
  digital: "bg-chart-5/15 text-chart-5",
};
export default function InvestmentCard({ investment, onWatch, watched, pending }) {
  const change = investment.daily_change_percent ?? 0;
  const rate = useUsdBwpRate();
  const currency = investment.currency || "BWP";
  const isForeign = currency !== "BWP";
  const bwpValue = nativeToBwp(investment.price, currency, rate);
  return (
    <Link to={`/investment/${investment.id}`} className="block">
      <Card className="group h-full overflow-hidden p-5 shadow-card transition-all hover:shadow-card-hover border-border/70">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm">
              {investment.ticker.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold tracking-tight">{investment.ticker}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", CATEGORY_TONE[investment.category] || CATEGORY_TONE.equity)}>
                  {investment.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{investment.name}</p>
            </div>
          </div>
          {onWatch && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(investment); }}
              disabled={pending}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full transition-colors",
                pending ? "cursor-progress opacity-60" : "hover:bg-muted",
                watched ? "text-warning" : "text-muted-foreground hover:text-warning"
              )}
              aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star className={cn("h-4 w-4", watched && "fill-current")} />
            </button>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="font-display text-xl font-bold tabular-nums">{formatMoney(investment.price, currency)}</div>
            {isForeign && (
              <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">≈ {formatCurrency(bwpValue)}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <ChangeBadge value={change} />
            <span className="text-xs text-muted-foreground">{investment.exchange}</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>{investment.sector}</span>
          {investment.dividend_yield > 0 ? (
            <span className="font-medium text-foreground">Yield {investment.dividend_yield}%</span>
          ) : (
            <span>No dividend</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
