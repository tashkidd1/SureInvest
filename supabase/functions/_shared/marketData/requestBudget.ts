// Centralized provider request budget + request logging. Mansa's free tier is
// 100 requests/day (verified via the API's /health endpoint and 401 schema);
// SureInvest keeps a safety ceiling of DAILY_MANSA_CEILING per UTC day, counted
// from MarketDataRequest log rows. Every provider call is logged here (never
// with secrets) so daily usage, which operation made a call, and whether it
// succeeded are always answerable.
export const DAILY_MANSA_CEILING = 70;
const SNAPSHOT_MIN_INTERVAL_MS = 15 * 60 * 1000;
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
// Count of Mansa requests logged since UTC midnight.
export async function countMansaRequestsToday(base44) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'mansa' }, '-created_date', 200
  );
  const cutoff = startOfTodayUtc();
  return rows.filter((r) => new Date(r.created_date).getTime() >= cutoff).length;
}
// Mansa daily budget gate: { allowed, used, ceiling }.
export async function checkMansaBudget(base44) {
  const used = await countMansaRequestsToday(base44);
  return { allowed: used < DAILY_MANSA_CEILING, used, ceiling: DAILY_MANSA_CEILING };
}
// If the last successful BSE snapshot is younger than the snapshot freshness
// interval, return its info so a repeat refresh can defer and conserve quota.
export async function recentBseSnapshot(base44) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'mansa', category: 'bse_snapshot', status: 'success' }, '-created_date', 1
  );
  const last = rows[0];
  if (!last) return null;
  const age = Date.now() - new Date(last.created_date).getTime();
  return age < SNAPSHOT_MIN_INTERVAL_MS ? { at: last.created_date, ageMinutes: Math.round(age / 60000) } : null;
}
// Log a provider request. Never throws — observability must not break a
// refresh. Prunes log rows older than 7 days to keep the entity bounded.
export async function logProviderRequest(base44, entry) {
  try {
    await base44.asServiceRole.entities.MarketDataRequest.create({
      provider: entry.provider,
      category: entry.category,
      status: entry.status,
      http_status: entry.http_status,
      securities_updated: entry.securities_updated || 0,
      error_summary: entry.error_summary ? String(entry.error_summary).slice(0, 300) : undefined,
    });
    try {
      const cutoff = new Date(Date.now() - PRUNE_AFTER_MS).toISOString();
      await base44.asServiceRole.entities.MarketDataRequest.deleteMany({
        created_date: { $lt: cutoff },
      });
    } catch (_e) {
      // pruning is best-effort
    }
  } catch (_e) {
    // logging must never break the refresh
  }
}
