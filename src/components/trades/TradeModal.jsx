import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/lib/format";
import { formatMoney, nativeToBwp, useUsdBwpRate } from "@/lib/currency";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/AccountContext";
import { invalidateTrade } from "@/lib/queries";
import { Loader2 } from "lucide-react";
export default function TradeModal({ open, onOpenChange, investment, mode = "buy", holding, cashBalance, onDone }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { accountType, isDemo } = useAccount();
  const [units, setUnits] = useState("");
  const [loading, setLoading] = useState(false);
  const rate = useUsdBwpRate();
  const currency = investment?.currency || "BWP";
  const isForeign = currency !== "BWP";
  const price = investment?.price || 0;
  const isBuy = mode === "buy";
  const bwpUnitCost = nativeToBwp(price, currency, rate);
  const nativeTotal = (Number(units) || 0) * price;
  const bwpTotal = nativeToBwp(nativeTotal, currency, rate);
  const maxUnits = isBuy ? (bwpUnitCost > 0 ? Math.floor((cashBalance || 0) / bwpUnitCost) : 0) : Math.floor(holding?.units || 0);
  const invalid = isBuy ? bwpTotal > (cashBalance || 0) : Number(units) > (holding?.units || 0);
  const reset = () => setUnits("");
  const close = () => { reset(); onOpenChange(false); };
  const submit = async () => {
    const u = Number(units);
    if (!u || u <= 0) return;
    setLoading(true);
    try {
      const client_ref = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const res = await base44.functions.invoke("executeTrade", { action: mode, investment_id: investment.id, units: u, client_ref, account_type: accountType });
      await invalidateTrade(qc, user?.id);
      toast({ title: isBuy ? "Purchase completed" : "Sale completed", description: `${isBuy ? "Bought" : "Sold"} ${u} ${investment.ticker}.` });
      reset();
      onOpenChange(false);
      onDone?.(res?.data);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Trade failed";
      toast({ title: "Trade failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isBuy ? "Buy" : "Sell"} {investment?.ticker}</DialogTitle>
          <DialogDescription>{investment?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Price per unit</span>
            <span className="font-medium tabular-nums">
              {formatMoney(price, currency)}
              {isForeign && <span className="ml-1.5 text-xs text-muted-foreground">≈ {formatCurrency(bwpUnitCost)}</span>}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="units">Units</Label>
            <Input id="units" type="number" min="0" step="any" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" autoFocus />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{isBuy ? `Max affordable: ${maxUnits}` : `You own: ${holding?.units || 0}`}</span>
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setUnits(String(maxUnits))}>Max</button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fees</span>
            <span className="font-medium">{formatCurrency(0)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-medium">Total (BWP)</span>
            <div className="text-right">
              <div className="font-display text-lg font-bold tabular-nums">{formatCurrency(bwpTotal)}</div>
              {isForeign && units ? (
                <div className="text-xs text-muted-foreground tabular-nums">{formatMoney(nativeTotal, currency)} · rate {rate.toFixed(2)}</div>
              ) : null}
            </div>
          </div>
          {invalid && units ? (
            <p className="text-xs text-destructive">{isBuy ? "Not enough cash for this order." : "You don't own that many units."}</p>
          ) : null}
          {isDemo ? (
            <p className="text-xs text-muted-foreground">Simulated trade — no real money or securities are involved.</p>
          ) : (
            <p className="text-xs text-destructive">Real-account trading is not yet enabled. Switch to your Demo Account to place simulated trades.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !units || invalid || !isDemo} className={isBuy ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {isBuy ? "Confirm buy" : "Confirm sell"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
