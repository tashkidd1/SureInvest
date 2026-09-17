import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { Repeat, Plus, Trash2, Power, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/AccountContext";
import { useRecurringInvestments, useInvestments } from "@/hooks/useEntityQueries";
import { invalidateRecurring } from "@/lib/queries";

const FREQUENCIES = [
  { key: "weekly", label: "Weekly" },
  { key: "bi-weekly", label: "Bi-weekly" },
  { key: "monthly", label: "Monthly" },
];

function nextDate(freq) {
  const d = new Date();
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "bi-weekly") d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export default function AutoInvest() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isDemo } = useAccount();
  const qc = useQueryClient();
  const { data: plans = [], isLoading: loading } = useRecurringInvestments();
  const { data: investments = [] } = useInvestments();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ investment_id: "", amount: "", frequency: "monthly" });
  const [testing, setTesting] = useState(false);
  const refresh = () => invalidateRecurring(qc, user?.id);

  const resetForm = () => {
    setForm({ investment_id: "", amount: "", frequency: "monthly" });
    setAdding(false);
    setEditingId(null);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({ investment_id: "", amount: "", frequency: "monthly" });
    setAdding(true);
  };

  const startEdit = (plan) => {
    setEditingId(plan.id);
    setForm({
      investment_id: plan.investment_id || "",
      amount: String(plan.amount ?? ""),
      frequency: plan.frequency || "monthly",
    });
    setAdding(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const inv = investments.find((i) => i.id === form.investment_id);
    const amount = Number(form.amount);
    if (!inv || !(amount > 0)) {
      toast({ title: "Check your plan", description: "Select an investment and enter an amount greater than P0.", variant: "destructive" });
      return;
    }

    try {
      // Server-side validated plan CRUD — amount, investment, frequency and
      // account_type are enforced in manageRecurringInvestment.
      if (editingId) {
        const res = await base44.functions.invoke("manageRecurringInvestment", {
          action: "update",
          plan_id: editingId,
          investment_id: inv.id,
          amount,
          frequency: form.frequency,
        });
        const d = res?.data || res || {};
        if (d.error) throw new Error(d.error);
        toast({ title: "Auto-Invest plan updated" });
      } else {
        const res = await base44.functions.invoke("manageRecurringInvestment", {
          action: "create",
          investment_id: inv.id,
          amount,
          frequency: form.frequency,
        });
        const d = res?.data || res || {};
        if (d.error) throw new Error(d.error);
        toast({ title: "Auto-Invest plan created" });
      }
      resetForm();
      refresh();
    } catch (e) {
      toast({ title: editingId ? "Could not update plan" : "Could not create plan", description: e?.message || "Try again.", variant: "destructive" });
    }
  };

  const toggle = async (plan) => {
    try {
      const res = await base44.functions.invoke("manageRecurringInvestment", {
        action: "toggle",
        plan_id: plan.id,
      });
      const d = res?.data || res || {};
      if (d.error) throw new Error(d.error);
      refresh();
    } catch (e) {
      toast({ title: "Could not update plan", description: e?.message || "Try again.", variant: "destructive" });
    }
  };

  const remove = async (id) => {
    try {
      const res = await base44.functions.invoke("manageRecurringInvestment", {
        action: "delete",
        plan_id: id,
      });
      const d = res?.data || res || {};
      if (d.error) throw new Error(d.error);
      refresh();
    } catch (e) {
      toast({ title: "Could not delete plan", description: e?.message || "Try again.", variant: "destructive" });
    }
  };

  const runTestNow = () => {
    setTesting(true);
    base44.functions.invoke("executeRecurringInvestment", { force: true })
      .then((res) => {
        const d = res?.data || res || {};
        toast({ title: "Test run complete", description: `Checked ${d.checked ?? 0} of your plans · executed ${d.executed ?? 0} · skipped ${d.skipped ?? 0} · failed ${d.failed ?? 0}` });
        refresh();
      })
      .catch((e) => toast({ title: "Test run failed", description: e?.message || "Try again.", variant: "destructive" }))
      .finally(() => setTesting(false));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Auto-Invest" subtitle="Schedule recurring simulated investments and let your portfolio grow steadily." icon={Repeat} />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!isDemo && <span className="mr-auto text-xs text-muted-foreground">Auto-Invest is currently available in Demo only.</span>}
        {user?.role === "admin" && plans.length > 0 && (
          <Button variant="outline" onClick={runTestNow} disabled={testing}>
            {testing ? "Running…" : "Test: run my plans now"}
          </Button>
        )}
        {isDemo && <Button onClick={startAdd}><Plus className="mr-1.5 h-4 w-4" /> New plan</Button>}
      </div>

      {adding && isDemo && (
        <Card className="p-5 shadow-card border-border/70">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">{editingId ? "Edit Auto-Invest plan" : "Create Auto-Invest plan"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose what to invest, how much to invest, and how often it should run.</p>
          </div>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
            <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm sm:col-span-2" value={form.investment_id} onChange={(e) => setForm({ ...form, investment_id: e.target.value })} required>
              <option value="">Select investment…</option>
              {investments.map((i) => <option key={i.id} value={i.id}>{i.ticker} — {i.name}</option>)}
            </select>
            <input className="h-10 rounded-lg border border-input bg-card px-3 text-sm" placeholder="Amount (P)" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <div className="sm:col-span-4 flex gap-2">
              <Button type="submit">{editingId ? "Save changes" : "Create plan"}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : plans.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No Auto-Invest plans yet. Create one to schedule recurring simulated investments.</Card>
      ) : (
        <Card className="divide-y divide-border shadow-card border-border/70">
          {plans.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Repeat className="h-4 w-4" /></div>
                <div>
                  <div className="font-semibold text-sm">{p.ticker} <span className="font-normal text-muted-foreground">· {p.name}</span></div>
                  <div className="text-xs text-muted-foreground capitalize">{p.frequency} · next {formatDate(p.next_date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-sm">{formatCurrency(p.amount)}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", p.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                  {p.active ? "Active" : "Paused"}
                </span>
                <button onClick={() => startEdit(p)} className="text-muted-foreground hover:text-primary" aria-label={`Edit ${p.ticker} plan`} title="Edit plan"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => toggle(p)} className="text-muted-foreground hover:text-primary" aria-label="Toggle" title={p.active ? "Pause plan" : "Resume plan"}><Power className="h-4 w-4" /></button>
                <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete" title="Delete plan"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </Card>
      )}
      <Disclaimer />
    </div>
  );
}
