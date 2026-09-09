import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { Target, Plus, CheckCircle2 } from "lucide-react";
export default function GoalCard({ goal, onContribute }) {
  const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
  const complete = pct >= 100;
  return (
    <Card className="p-5 shadow-card border-border/70 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">{goal.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{goal.category} · {goal.target_date || "No deadline"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums">{pct}%</span>
          {complete && <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success"><CheckCircle2 className="h-3 w-3" /> Completed</span>}
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${complete ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(goal.current_amount)}</span>
        <span>{formatCurrency(goal.target_amount)}</span>
      </div>
      {onContribute && !complete && (
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onContribute(goal)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add funds
        </Button>
      )}
    </Card>
  );
}
