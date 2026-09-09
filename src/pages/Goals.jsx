import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useGoals, useCash } from "@/hooks/useEntityQueries";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/AccountContext";
import PageHeader from "@/components/common/PageHeader";
import GoalCard from "@/components/goals/GoalCard";
import GoalContributeModal from "@/components/goals/GoalContributeModal";
import Disclaimer from "@/components/common/Disclaimer";
import { Target, Plus, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
const CATEGORIES = [
  { key: "wealth", label: "Wealth" },
  { key: "retirement", label: "Retirement" },
  { key: "education", label: "Education" },
  { key: "home", label: "Home" },
  { key: "emergency", label: "Emergency" },
  { key: "other", label: "Other" },
];
// Calendar "today" in CAT (UTC+2) — the app's home timezone. Past target
// dates are blocked here and re-validated by the createGoal backend function.
const TODAY_CAT = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
export default function Goals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { accountType, isDemo } = useAccount();
  const goalsQ = useGoals();
  const cashQ = useCash();
  const goals = goalsQ.data || [];
  const cash = cashQ.data?.balance || 0;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: "", target_date: "", category: "wealth" });
  const [contribGoal, setContribGoal] = useState(null);
  const [creating, setCreating] = useState(false);
  const invalidateGoals = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["goals", user?.id] }),
    qc.invalidateQueries({ queryKey: ["portfolio", user?.id] }),
  ]);
  const name = form.name.trim();
  const amount = Number(form.target_amount);
  const pastDate = !!form.target_date && form.target_date < TODAY_CAT;
  const formValid =
    name.length > 0 && name.length <= 50 && !!form.target_amount && amount > 0 && !pastDate;
  const submit = async (e) => {
    e.preventDefault();
    if (creating || !formValid) return;
    setCreating(true);
    try {
      // Server-side validated creation — the createGoal function enforces the
      // same rules independently, so a modified client cannot bypass them.
      await base44.functions.invoke("createGoal", {
        name,
        target_amount: amount,
        target_date: form.target_date || undefined,
        category: form.category,
        account_type: accountType,
      });
      toast({ title: "Goal created" });
      await invalidateGoals();
      setForm({ name: "", target_amount: "", target_date: "", category: "wealth" });
      setAdding(false);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Please check the goal details.";
      toast({ title: "Could not create goal", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };
  const remove = async (id) => {
    await base44.entities.Goal.delete(id);
    await invalidateGoals();
  };
  const isComplete = (g) => (Number(g.current_amount) || 0) >= (Number(g.target_amount) || 0) || g.status === "completed";
  const active = goals.filter((g) => !isComplete(g));
  const completed = goals.filter((g) => isComplete(g));
  return (
    <div className="space-y-6">
      <PageHeader title="Goals" subtitle="Invest toward what matters to you — a home, education, retirement or an emergency fund." icon={Target} />
      <div className="flex justify-end">
        {isDemo ? (
          <Button onClick={() => setAdding((v) => !v)}><Plus className="mr-1.5 h-4 w-4" /> New goal</Button>
        ) : (
          <span className="self-center text-xs text-muted-foreground">Goals are a Demo Account feature — real-account goals are coming soon.</span>
        )}
      </div>
      {adding && (
        <Card className="p-5 shadow-card border-border/70">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
            <input className="h-10 rounded-lg border border-input bg-card px-3 text-sm" placeholder="Goal name" maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="h-10 rounded-lg border border-input bg-card px-3 text-sm" placeholder="Target (P)" type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
            <input className="h-10 rounded-lg border border-input bg-card px-3 text-sm" type="date" min={TODAY_CAT} value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <div className="sm:col-span-4 flex gap-2">
              <Button type="submit" disabled={creating || !formValid}>
                {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Create goal
              </Button>
              <Button type="button" variant="outline" disabled={creating} onClick={() => setAdding(false)}>Cancel</Button>
              <span className="text-xs text-muted-foreground">{name.length}/50 characters</span>
              {pastDate && (
                <span className="text-xs text-destructive">Target date cannot be in the past.</span>
              )}
            </div>
          </form>
        </Card>
      )}
      {goalsQ.isLoading ? (
        <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Active goals</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((g) => (
                <div key={g.id} className="relative">
                  <GoalCard goal={g} onContribute={isDemo ? setContribGoal : undefined} />
                  <button onClick={() => remove(g.id)} className="absolute right-3 top-3 text-muted-foreground hover:text-destructive" aria-label="Delete goal">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {active.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">No active goals. Create your first one above.</Card>}
            </div>
          </section>
          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Completed goals</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((g) => (
                  <div key={g.id} className="relative">
                    <GoalCard goal={g} />
                    <button onClick={() => remove(g.id)} className="absolute right-3 top-3 text-muted-foreground hover:text-destructive" aria-label="Delete goal">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      <GoalContributeModal
        open={!!contribGoal}
        onOpenChange={(o) => !o && setContribGoal(null)}
        goal={contribGoal}
        cashBalance={cash}
      />
      <Disclaimer />
    </div>
  );
}
