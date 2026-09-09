import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/AccountContext";
import { invalidateGoal } from "@/lib/queries";
import { Loader2 } from "lucide-react";
// Contribute to a goal. Frontend pre-validates against the remaining amount
// (target − current) and available cash; the backend re-validates. Over- or
// completed-contributions are rejected (never silently clamped), and the user
// is offered a one-click "contribute exactly the remaining amount" action.
export default function GoalContributeModal({ open, onOpenChange, goal, cashBalance, onDone }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { accountType } = useAccount();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const target = Number(goal?.target_amount) || 0;
  const current = Number(goal?.current_amount) || 0;
  const remaining = Math.max(0, target - current);
  const completed = current >= target;
  const value = Number(amount) || 0;
  const overRemaining = value > remaining;
  const overCash = value > (cashBalance || 0);
  const invalid = value <= 0 || overRemaining || overCash || completed;
  const submit = async (amt) => {
    const v = Number(amt);
    if (!v || v <= 0) return;
    setLoading(true);
    try {
      const client_ref = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const res = await base44.functions.invoke("contributeToGoal", { goal_id: goal.id, amount: v, client_ref, account_type: accountType });
      const data = res?.data || {};
      if (data.completed) {
        toast({ title: "Goal completed!", description: `You've reached the target for ${goal.name}.` });
      } else {
        toast({ title: "Contribution added", description: `P${v.toFixed(2)} added to ${goal.name}.` });
      }
      await invalidateGoal(qc, user?.id);
      setAmount("");
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      const data = e?.response?.data || {};
      if (data.over) {
        toast({ title: "Contribution too high", description: `Only P${Number(data.remaining).toFixed(2)} is needed to complete this goal.`, variant: "destructive" });
      } else if (data.completed) {
        toast({ title: "Goal already completed", description: "This goal has reached its target.", variant: "destructive" });
      } else {
        const msg = data.error || e?.message || "Contribution failed";
        toast({ title: "Contribution failed", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contribute to {goal?.name}</DialogTitle>
          <DialogDescription>Move virtual cash from your account into this goal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {completed ? (
            <p className="text-sm text-success">This goal is already completed — no further contributions are needed.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (P)</Label>
                <Input id="amount" type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cash available: {formatCurrency(cashBalance)}</span>
                  <span>Remaining to target: {formatCurrency(remaining)}</span>
                </div>
              </div>
              {value > 0 && overRemaining && (
                <p className="text-xs text-destructive">Only {formatCurrency(remaining)} is needed to complete this goal.</p>
              )}
              {value > 0 && !overRemaining && overCash && (
                <p className="text-xs text-destructive">Enter an amount up to your available cash.</p>
              )}
              {remaining > 0 && (
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setAmount(String(remaining))}>
                  Contribute exactly {formatCurrency(remaining)} to complete
                </button>
              )}
              <p className="text-xs text-muted-foreground">This is simulated money — no real funds move.</p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={() => submit(amount)} disabled={loading || invalid}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Add contribution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
