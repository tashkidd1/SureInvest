import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMarketData } from "@/lib/queries";
import { resetUsdBwpRateCache } from "@/lib/currency";

const REFRESH_CACHE_KEY = 'market_data_refresh_status';
const PROVIDER_STALE_MINUTES = { global: 30, bse: 30, fx: 60 };

// Get last refresh times from localStorage
function getRefreshStatus() {
  try {
    const cached = localStorage.getItem(REFRESH_CACHE_KEY);
    return cached ? JSON.parse(cached) : { global: null, bse: null, fx: null, lastFetch: null };
  } catch {
    return { global: null, bse: null, fx: null, lastFetch: null };
  }
}

// Save refresh times to localStorage
function saveRefreshStatus(status) {
  try {
    localStorage.setItem(REFRESH_CACHE_KEY, JSON.stringify(status));
  } catch {
    // localStorage unavailable
  }
}

// Check if any provider needs refreshing
function hasStaleProviders(status) {
  const now = Date.now();
  const providers = ['global', 'bse', 'fx'];
  
  for (const provider of providers) {
    const lastTime = status[provider];
    if (!lastTime) return true; // Never refreshed
    const ageMs = now - lastTime;
    const staleMs = PROVIDER_STALE_MINUTES[provider] * 60 * 1000;
    if (ageMs > staleMs) return true;
  }
  
  return false;
}

// Format how long ago each provider was last refreshed
function getRefreshStatusText(status) {
  const now = Date.now();
  const parts = [];
  
  for (const provider of ['global', 'bse', 'fx']) {
    const lastTime = status[provider];
    if (!lastTime) {
      parts.push(`${provider}: never`);
    } else {
      const ageMin = Math.round((now - lastTime) / 60000);
      if (ageMin < 1) {
        parts.push(`${provider}: just now`);
      } else if (ageMin < 60) {
        parts.push(`${provider}: ${ageMin}m ago`);
      } else {
        const ageHr = Math.round(ageMin / 60);
        parts.push(`${provider}: ${ageHr}h ago`);
      }
    }
  }
  
  return parts.join(' • ');
}

// Admin-only manual trigger for the unified refreshMarketData backend flow
// (Twelve Data → Global, Mansa → BSE). All real logic (authorization, stale
// symbol rotation, request budgets, provider requests, persistence) stays
// server-side — this component only invokes it and refreshes the client cache.
// SMART REFRESH: Only calls API if at least one provider is stale (>30min for
// global/bse, >60min for fx). Shows status of each provider's last refresh.
export default function RefreshMarketDataButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState(getRefreshStatus());
  const [nextStaleTime, setNextStaleTime] = useState(null);

  // Update countdown timer every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getRefreshStatus();
      setRefreshStatus(current);
      
      if (hasStaleProviders(current)) {
        setNextStaleTime(null);
      } else {
        // Calculate when the oldest provider becomes stale
        const now = Date.now();
        let minStaleTime = Infinity;
        
        for (const provider of ['global', 'bse', 'fx']) {
          const lastTime = current[provider];
          if (lastTime) {
            const staleTime = lastTime + PROVIDER_STALE_MINUTES[provider] * 60 * 1000;
            minStaleTime = Math.min(minStaleTime, staleTime);
          }
        }
        
        if (minStaleTime !== Infinity) {
          setNextStaleTime(new Date(minStaleTime).toLocaleTimeString());
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  if (user?.role !== "admin") return null;

  const isStale = hasStaleProviders(refreshStatus);
  const statusText = getRefreshStatusText(refreshStatus);

  const run = async () => {
    // Skip if all providers are fresh
    if (!isStale && refreshStatus.lastFetch) {
      toast({
        title: "All providers are fresh",
        description: `${statusText}. Next refresh available ${nextStaleTime ? `at ${nextStaleTime}` : 'soon'}.`,
      });
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const res = await base44.functions.invoke("refreshMarketData", {});
      const data = res?.data || {};
      
      // Update refresh status with current times
      const now = Date.now();
      const newStatus = { ...refreshStatus, lastFetch: now };
      
      // Only update provider times if they were actually refreshed
      if (data.global?.status === 'updated') newStatus.global = now;
      if (data.bse?.status === 'updated') newStatus.bse = now;
      if (data.fx_rate) newStatus.fx = now;
      
      saveRefreshStatus(newStatus);
      setRefreshStatus(newStatus);

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
        // provider_error / no_key — the backend retained all cached prices.
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
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        onClick={run}
        disabled={loading || (!isStale && refreshStatus.lastFetch)}
        className="shrink-0 self-start gap-2 border-primary/30 text-primary hover:bg-primary-soft hover:text-primary sm:self-auto"
        title={statusText}
      >
        <RefreshCw className={loading ? "animate-spin" : ""} />
        {loading ? "Refreshing…" : isStale ? "Refresh prices" : "All fresh"}
      </Button>
      <div className="text-xs text-slate-500" title={statusText}>
        {statusText}
      </div>
    </div>
  );
}
