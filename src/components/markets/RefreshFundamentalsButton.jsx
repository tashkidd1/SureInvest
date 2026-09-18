import { useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMarketData } from "@/lib/queries";

// Admin-only on-demand refresh for provider-backed company fundamentals.
// The Edge Function performs the real authorization and provider calls.
export default function RefreshFundamentalsButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  if (user?.role !== "admin") return null;

  const run = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("refreshFundamentals", {});
      const data = res?.data || res || {};

      if (data.status === "updated" || data.status === "partial") {
        await invalidateMarketData(qc, user?.id);
        toast({
          title: data.status === "partial" ? "Fundamentals partially refreshed" : "Fundamentals refreshed",
          description: data.message || "Updated " + (data.updated ?? 0) + " investment(s).",
          variant: data.status === "partial" ? "destructive" : undefined,
        });
      } else if (data.status === "no_key") {
        toast({
          title: "Twelve Data key is not configured",
          description: data.message || "Add TWELVE_DATA_API_KEY to the Edge Function secrets.",
          variant: "destructive",
        });
      } else {
        const failedCount = Array.isArray(data.failed) ? data.failed.length : 0;
        toast({
          title: "No live fundamentals updated",
          description: data.message || (failedCount ? failedCount + " investment(s) could not be updated." : "The provider did not return supported fundamentals."),
          variant: "destructive",
        });
      }
    } catch (_e) {
      toast({
        title: "Unable to refresh fundamentals",
        description: "Existing fundamentals remain unchanged.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={loading}
      title="Fetch provider-backed market fundamentals"
      className="shrink-0 self-start gap-2 border-primary/30 text-primary hover:bg-primary-soft hover:text-primary sm:self-auto"
    >
      {loading ? <RefreshCw className="animate-spin" /> : <Database />}
      {loading ? "Refreshing fundamentals…" : "Refresh fundamentals"}
    </Button>
  );
}
