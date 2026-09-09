import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import ChangeBadge from "./ChangeBadge";
export default function StatCard({ label, value, change, changeLabel, icon: Icon, tone = "default", className }) {
  const toneStyles = {
    default: "bg-card",
    primary: "bg-primary text-primary-foreground",
    soft: "bg-primary-soft",
    accent: "bg-accent-soft",
  };
  return (
    <Card className={cn("p-5 shadow-card border-border/70", toneStyles[tone], className)}>
      <div className="flex items-center justify-between">
        <p className={cn("text-sm font-medium", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>{label}</p>
        {Icon && (
          <div className={cn("grid h-8 w-8 place-items-center rounded-lg", tone === "primary" ? "bg-primary-foreground/15" : "bg-background/60")}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {(change !== undefined || changeLabel) && (
        <div className="mt-2 flex items-center gap-2">
          {change !== undefined && <ChangeBadge value={change} />}
          {changeLabel && <span className={cn("text-xs", tone === "primary" ? "text-primary-foreground/70" : "text-muted-foreground")}>{changeLabel}</span>}
        </div>
      )}
    </Card>
  );
}
