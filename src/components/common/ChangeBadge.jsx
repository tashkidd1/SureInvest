import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPercent } from "@/lib/format";
export default function ChangeBadge({ value, percent = true, className, size = "sm" }) {
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md font-semibold tabular-nums",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
        positive && "bg-success/12 text-success",
        negative && "bg-destructive/12 text-destructive",
        !positive && !negative && "bg-muted text-muted-foreground",
        className
      )}
    >
      {Icon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {percent ? formatPercent(value) : `${value > 0 ? "+" : ""}${value}`}
    </span>
  );
}
