// Centralized provider request budget + request logging.
// Mansa free tier ≈ 100 requests/day; SureInvest uses DAILY_MANSA_CEILING.
// Twelve Data free tier ≈ 8 credits/minute — GLOBAL_MIN_INTERVAL conserves quota.
export const DAILY_MANSA_CEILING = 70;
const SNAPSHOT_MIN_INTERVAL_MS = 15 * 60 * 1000;
export const GLOBAL_MIN_INTERVAL_MS = 10 * 60 * 1000; // min gap between global quote runs
export const FX_MIN_INTERVAL_MS = 30 * 60 * 1000;
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export async function countMansaRequestsToday(base44) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'mansa' }, '-created_date', 200
  );
  const cutoff = startOfTodayUtc();
  return rows.filter((r) => new Date(r.created_date).getTime() >= cutoff).length;
}

/** Mansa daily budget gate — applies to every Mansa HTTP call category. */
export async function checkMansaBudget(base44) {
  const used = await countMansaRequestsToday(base44);
  return { allowed: used < DAILY_MANSA_CEILING, used, ceiling: DAILY_MANSA_CEILING };
}

/**
 * Reserve one Mansa slot: budget check + optional freshness gate.
 * Call before *any* Mansa network request (snapshot, index, future endpoints).
 */
export async function assertMansaRequestAllowed(base44, category, minIntervalMs = 0) {
  if (minIntervalMs > 0) {
    const fresh = await recentRequest(base44, category, minIntervalMs);
    if (fresh) {
      return {
        allowed: false,
        reason: 'fresh',
        used: null,
        ceiling: DAILY_MANSA_CEILING,
        fresh,
      };
    }
  }
  const budget = await checkMansaBudget(base44);
  if (!budget.allowed) {
    return {
      allowed: false,
      reason: 'budget',
      used: budget.used,
      ceiling: budget.ceiling,
      fresh: null,
    };
  }
  return {
    allowed: true,
    reason: null,
    used: budget.used,
    ceiling: budget.ceiling,
    fresh: null,
  };
}

export async function recentBseSnapshot(base44) {
  return recentRequest(base44, 'bse_snapshot', SNAPSHOT_MIN_INTERVAL_MS);
}

export async function recentRequest(base44, category, minIntervalMs) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'mansa', category, status: 'success' }, '-created_date', 1
  );
  const last = rows[0];
  if (!last) return null;
  const age = Date.now() - new Date(last.created_date).getTime();
  return age < minIntervalMs ? { at: last.created_date, ageMinutes: Math.round(age / 60000) } : null;
}

/** Twelve Data / global throttle: last successful global_quotes within interval. */
export async function recentGlobalQuotes(base44, minIntervalMs = GLOBAL_MIN_INTERVAL_MS) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'twelve_data', category: 'global_quotes', status: 'success' },
    '-created_date',
    1,
  );
  const last = rows[0];
  if (!last) return null;
  const age = Date.now() - new Date(last.created_date).getTime();
  return age < minIntervalMs ? { at: last.created_date, ageMinutes: Math.round(age / 60000) } : null;
}

export async function recentFxRefresh(base44, minIntervalMs = FX_MIN_INTERVAL_MS) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'twelve_data', category: 'fx_usd_bwp', status: 'success' },
    '-created_date',
    1,
  );
  const last = rows[0];
  if (!last) return null;
  const age = Date.now() - new Date(last.created_date).getTime();
  return age < minIntervalMs ? { at: last.created_date, ageMinutes: Math.round(age / 60000) } : null;
}

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
