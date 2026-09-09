import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { Wallet, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";
import { useCash } from "@/hooks/useEntityQueries";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/AccountContext";
import { invalidateCash } from "@/lib/queries";
export default function Cash() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemo } = useAccount();
  const cashQ = useCash();
  const account = cashQ.data;
  const loading = cashQ.isLoading;
  const [toppingUp, setToppingUp] = useState(false);
  const topUp = async () => {
    if (!account || toppingUp) return;
    setToppingUp(true);
    try {
      const newBalance = (account.balance || 0) + 5000;
      await base44.entities.CashAccount.update(account.id, { balance: newBalance, available: newBalance });
      await base44.entities.Transaction.create({ type: "deposit", amount: 5000, currency: "BWP", description: "Demo top-up", account_type: "demo" });
      // Persistent notification — mirrors buy/sell so top-ups appear in the
      // Notifications section. Isolated so a notification failure never
      // breaks the top-up itself.
      try {
        await base44.entities.Notification.create({
          title: "Cash topped up",
          body: "P5,000 demo cash added to your account.",
          type: "success",
          icon: "Wallet",
        });
      } catch (_) { /* notification is best-effort */ }
      await invalidateCash(qc, user?.id);
      toast({ title: "Added P5,000 demo cash" });
    } catch (e) {
      toast({ title: "Could not add cash", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setToppingUp(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Cash" subtitle="Your simulated cash balance. Top up anytime — it's not real money." icon={Wallet} />
      {loading ? (
        <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : (
        <Card className="overflow-hidden shadow-card border-border/70">
          <div className="bg-primary p-6 text-primary-foreground">
            <p className="text-sm text-primary-foreground/80">{isDemo ? "Demo Cash Account" : "Real Cash Account"}</p>
            <div className="mt-2 font-display text-4xl font-bold tabular-nums">{formatCurrency(account?.balance || 0)}</div>
            <p className="mt-1 text-xs text-primary-foreground/70">Available to invest</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 p-4">
            {isDemo ? (
              <>
                <Button onClick={topUp} disabled={toppingUp}>
                  {toppingUp ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ArrowDownLeft className="mr-1.5 h-4 w-4" />}
                  Add demo cash
                </Button>
                <Button variant="outline"><ArrowUpRight className="mr-1.5 h-4 w-4" /> Withdraw</Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Real-account cash will appear here once real investing is enabled.</p>
            )}
          </div>
        </Card>
      )}
      <Disclaimer />
    </div>
  );
}
