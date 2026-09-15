import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMarketData } from "@/lib/queries";
import { resetUsdBwpRateCache } from "@/lib/currency";

// Admin-only manual trigger for the unified refreshMarketData backend flow
// (Twelve Data → Global, Mansa → BSE). All real gating (authorization, stale
// symbol rotation, request budgets, provider request logging) happens
// server-side — this component just invokes it and refreshes the client
// cache. Prices also refresh automatically via a scheduled cron job, so this
// button is for an on-demand nudge, not the primary refresh mechanism.
export default function RefreshMarketDataButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  if (user?.role !== "admin") return null;

  const run = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("refreshMarketData", {});
      const data = res?.data || res || {};
      if (data.status === "ok" || data.status === "partial") {
        resetUsdBwpRateCache();
        await invalidateMarketData(qc, user?.id);
        const updated = (data.global?.updated ?? 0) + (data.bse?.updated ?? 0);
        toast({
          title: data.status === "partial" ? "Market data partially refreshed" : updated > 0 ? "Market data refreshed" : "Market data is up to date",
          description: data.message || "Provider refresh complete. Existing prices are shown where a provider was unavailable.",
          variant: data.status === "partial" ? "destructive" : undefined,
        });
      } else {
        toast({
          title: "Market data not refreshed",
          description: data.message || "Providers unavailable. Existing prices are still available.",
          variant: "destructive",
        });
      }
    } catch (_e) {
      toast({ title: "Unable to refresh market data", description: "Existing prices are still available.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={loading}
      className="shrink-0 self-start gap-2 border-primary/30 text-primary hover:bg-primary-soft hover:text-primary sm:self-auto"
    >
      <RefreshCw className={loading ? "animate-spin" : ""} />
      {loading ? "Refreshing…" : "Refresh prices"}
    </Button>
  );
}
