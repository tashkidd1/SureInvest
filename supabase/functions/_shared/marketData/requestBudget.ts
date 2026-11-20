// Centralized provider request budget + request logging.
// Mansa free tier ≈ 100 requests/day; SureInvest uses DAILY_MANSA_CEILING.
// Twelve Data free tier ≈ 8 credits/minute — GLOBAL_MIN_INTERVAL + credit estimates.
// deno-lint-ignore-file no-explicit-any
export const DAILY_MANSA_CEILING = 70;
/** Soft daily credit budget for Twelve Data (quotes + history + FX). */
export const DAILY_TWELVE_CREDIT_CEILING = 200;
/** Credits charged per global quote symbol in a batch. */
export const TWELVE_CREDIT_PER_QUOTE_SYMBOL = 1;
/** Credits charged per time_series backfill. */
export const TWELVE_CREDIT_PER_HISTORY = 1;
/** Credits charged per FX quote. */
export const TWELVE_CREDIT_PER_FX = 1;

const SNAPSHOT_MIN_INTERVAL_MS = 15 * 60 * 1000;
export const GLOBAL_MIN_INTERVAL_MS = 10 * 60 * 1000;
export const FX_MIN_INTERVAL_MS = 30 * 60 * 1000;
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export async function countMansaRequestsToday(base44: any) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'mansa' }, '-created_date', 200
  );
  const cutoff = startOfTodayUtc();
  return rows.filter((r: any) => new Date(r.created_date).getTime() >= cutoff).length;
}

export async function checkMansaBudget(base44: any) {
  const used = await countMansaRequestsToday(base44);
  return { allowed: used < DAILY_MANSA_CEILING, used, ceiling: DAILY_MANSA_CEILING };
}

export async function assertMansaRequestAllowed(
  base44: any,
  category: string,
  minIntervalMs = 0,
) {
  if (minIntervalMs > 0) {
    const fresh = await recentRequest(base44, category, minIntervalMs);
    if (fresh) {
      return {
        allowed: false,
        reason: 'fresh' as const,
        used: null as number | null,
        ceiling: DAILY_MANSA_CEILING,
        fresh,
      };
    }
  }
  const budget = await checkMansaBudget(base44);
  if (!budget.allowed) {
    return {
      allowed: false,
      reason: 'budget' as const,
      used: budget.used,
      ceiling: budget.ceiling,
      fresh: null as { at: string; ageMinutes: number } | null,
    };
  }
  return {
    allowed: true,
    reason: null as 'fresh' | 'budget' | null,
    used: budget.used,
    ceiling: budget.ceiling,
    fresh: null as { at: string; ageMinutes: number } | null,
  };
}

export async function recentBseSnapshot(base44: any) {
  return recentRequest(base44, 'bse_snapshot', SNAPSHOT_MIN_INTERVAL_MS);
}

export async function recentRequest(
  base44: any,
  category: string,
  minIntervalMs: number,
) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'mansa', category, status: 'success' }, '-created_date', 1
  );
  const last = rows[0];
  if (!last) return null;
  const age = Date.now() - new Date(last.created_date).getTime();
  return age < minIntervalMs ? { at: last.created_date as string, ageMinutes: Math.round(age / 60000) } : null;
}

export async function recentGlobalQuotes(
  base44: any,
  minIntervalMs = GLOBAL_MIN_INTERVAL_MS,
) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'twelve_data', category: 'global_quotes', status: 'success' },
    '-created_date',
    1,
  );
  const last = rows[0];
  if (!last) return null;
  const age = Date.now() - new Date(last.created_date).getTime();
  return age < minIntervalMs ? { at: last.created_date as string, ageMinutes: Math.round(age / 60000) } : null;
}

export async function recentFxRefresh(
  base44: any,
  minIntervalMs = FX_MIN_INTERVAL_MS,
) {
  const rows = await base44.asServiceRole.entities.MarketDataRequest.filter(
    { provider: 'twelve_data', category: 'fx_usd_bwp', status: 'success' },
    '-created_date',
    1,
  );
  const last = rows[0];
  if (!last) return null;
  const age = Date.now() - new Date(last.created_date).getTime();
  return age < minIntervalMs ? { at: last.created_date as string, ageMinutes: Math.round(age / 60000) } : null;
}

/** Simple exponential backoff helper for provider errors. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; isRetryable?: (err: unknown) => boolean } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 400;
  const isRetryable = opts.isRetryable ?? (() => true);
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries || !isRetryable(e)) throw e;
      await new Promise((r) => setTimeout(r, baseMs * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

export async function logProviderRequest(base44: any, entry: any) {
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
