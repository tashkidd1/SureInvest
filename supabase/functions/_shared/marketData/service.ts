// MarketDataService — provider-independent refresh orchestration.
// Coordinates Twelve Data (global) and Mansa (BSE), applies centralized
// request budgets, writes Investment / ExchangeRate caches, and returns a
// unified result. Provider failures are isolated; cached prices are retained.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSupabaseSecretKey } from '../base44Compat.ts';
import { fetchQuotes, fetchUsdBwpRate, fetchTimeSeries } from './twelveDataProvider.ts';
import { fetchBseSnapshot, fetchBseIndexHistory, toMansaTicker } from './mansaProvider.ts';
import {
  assertMansaRequestAllowed,
  recentGlobalQuotes,
  recentFxRefresh,
  logProviderRequest,
  GLOBAL_MIN_INTERVAL_MS,
  FX_MIN_INTERVAL_MS,
  DAILY_TWELVE_CREDIT_CEILING,
} from './requestBudget.ts';

function rpcClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, getSupabaseSecretKey('superkey'));
}

async function reserveTwelveCredits(credits: number): Promise<boolean> {
  const { data, error } = await rpcClient().rpc('reserve_twelve_data_credits', {
    p_credits: credits,
    p_daily_limit: DAILY_TWELVE_CREDIT_CEILING,
  });
  if (error) throw new Error('Unable to reserve Twelve Data credits: ' + error.message);
  return data?.allowed === true;
}

const GLOBAL_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'KO', 'AMZN', 'SPY', 'VXUS', 'VNQ', 'VIG', 'BTC/USD'];
const GLOBAL_PER_CALL = 6;
const HISTORY_BACKFILL_PER_RUN = 2;
const INDEX_REFRESH_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_MIN_INTERVAL_MS = 15 * 60 * 1000;

type MarketRefreshSection = {
  status: string;
  attempted: string[] | boolean;
  updated: number;
  failed: number;
  stale_cache?: boolean;
  message: string;
  [key: string]: any;
};

function nextHistory(inv: any, price: number, today: string, backfillPrices: number[] | null): Record<string, any> {
  const existing = Array.isArray(inv.historical_prices) ? inv.historical_prices : [];
  if (backfillPrices && backfillPrices.length) {
    return { historical_prices: backfillPrices.slice(-90), history_last_appended: today };
  }
  if (inv.history_last_appended === today) return {};
  return { historical_prices: [...existing, price].slice(-90), history_last_appended: today };
}

async function refreshGlobal(base44: any, apiKey: string, now: string): Promise<any> {
  // Throttle: skip network if a successful global run was recent — serve cache.
  const fresh = await recentGlobalQuotes(base44, GLOBAL_MIN_INTERVAL_MS);
  if (fresh) {
    return {
      status: 'fresh',
      attempted: [],
      updated: 0,
      failed: 0,
      stale_cache: true,
      message: `Global: last refresh ${fresh.ageMinutes} min ago — cached prices retained (quota conserved).`,
    };
  }

  const today = now.slice(0, 10);
  const rows = await base44.asServiceRole.entities.Investment.filter({ market: 'global' });
  const targets = rows
    .filter((r: any) => GLOBAL_SYMBOLS.includes(r.ticker))
    .sort((a: any, b: any) => (a.last_updated || '').localeCompare(b.last_updated || ''))
    .slice(0, GLOBAL_PER_CALL);
  if (!targets.length) {
    return { status: 'no_change', attempted: [], updated: 0, failed: 0, message: 'No global symbols found to refresh.' };
  }
  const symbols = targets.map((t) => t.ticker);
  if (!(await reserveTwelveCredits(symbols.length))) {
    return { status: 'deferred', attempted: [], updated: 0, failed: 0, stale_cache: true,
      message: `Global: Twelve Data daily credit budget reached (${DAILY_TWELVE_CREDIT_CEILING}) — cached prices retained.` };
  }
  const result = await fetchQuotes(apiKey, symbols);
  await logProviderRequest(base44, {
    provider: 'twelve_data', category: 'global_quotes',
    status: result.ok ? 'success' : 'error',
    http_status: result.httpStatus,
    error_summary: result.error,
    securities_updated: result.ok ? Object.keys(result.quotes || {}).length : 0,
  });
  if (!result.ok) {
    return {
      status: 'provider_error',
      attempted: symbols,
      updated: 0,
      failed: symbols.length,
      stale_cache: true,
      message: `${result.error}. Cached / seeded prices retained.`,
    };
  }
  let updated = 0;
  let failed = 0;
  let backfillsLeft = HISTORY_BACKFILL_PER_RUN;
  const updatedSymbols = [];
  for (const inv of targets as any[]) {
    const q = result.quotes[inv.ticker];
    if (!q) { failed += 1; continue; }
    try {
      let backfillPrices = null;
      if ((!inv.historical_prices || inv.historical_prices.length < 5) && backfillsLeft > 0) {
        const reserved = await reserveTwelveCredits(1);
        if (reserved) {
        const series = await fetchTimeSeries(apiKey, inv.ticker, 30);
        backfillsLeft -= 1;
        await logProviderRequest(base44, {
          provider: 'twelve_data',
          category: 'global_history',
          status: series.ok ? 'success' : 'error',
          http_status: series.httpStatus,
          securities_updated: series.ok ? 1 : 0,
        });
        if (series.ok && series.prices.length) backfillPrices = series.prices;
        }
      }
      await base44.asServiceRole.entities.Investment.update(inv.id, {
        price: q.price,
        previous_close: q.previous,
        daily_change: q.change,
        daily_change_percent: q.percent,
        currency: q.currency || inv.currency,
        data_source: 'twelve_data',
        last_updated: now,
        ...nextHistory(inv, q.price, today, backfillPrices),
      });
      updated += 1;
      updatedSymbols.push(inv.ticker);
    } catch (_e: unknown) {
      failed += 1;
    }
  }
  const status = updated > 0 ? 'updated' : (failed > 0 ? 'provider_error' : 'no_change');
  return {
    status,
    attempted: symbols,
    updated,
    failed,
    updatedSymbols,
    stale_cache: updated === 0,
    message: `Global: refreshed ${updated}/${symbols.length} prices (stalest ${GLOBAL_PER_CALL} of ${GLOBAL_SYMBOLS.length}).`,
  };
}

async function refreshBse(base44: any, apiKey: string, now: string): Promise<any> {
  const today = now.slice(0, 10);
  const gate = await assertMansaRequestAllowed(base44, 'bse_snapshot', SNAPSHOT_MIN_INTERVAL_MS);
  if (!gate.allowed) {
    if (gate.reason === 'fresh') {
      return {
        status: 'fresh',
        attempted: false,
        updated: 0,
        failed: 0,
        stale_cache: true,
        message: `BSE: snapshot ingested ${gate.fresh?.ageMinutes ?? 0} min ago — cached prices retained (quota conserved).`,
      };
    }
    return {
      status: 'deferred',
      attempted: false,
      updated: 0,
      failed: 0,
      stale_cache: true,
      message: `BSE: Mansa daily budget reached (${gate.used}/${gate.ceiling}) — cached prices retained.`,
    };
  }

  const result = await fetchBseSnapshot(apiKey);
  if (!result.ok) {
    await logProviderRequest(base44, {
      provider: 'mansa', category: 'bse_snapshot', status: 'error',
      http_status: result.httpStatus, error_summary: result.error,
    });
    return {
      status: 'provider_error',
      attempted: true,
      updated: 0,
      failed: 0,
      stale_cache: true,
      message: `BSE: ${result.error}. Cached prices retained.`,
    };
  }

  const rows = await base44.asServiceRole.entities.Investment.filter({ market: 'botswana' });
  let updated = 0;
  let failed = 0;
  const updatedSymbols = [];
  for (const inv of rows as any[]) {
    const q = result.quotes[toMansaTicker(inv.ticker)];
    if (!q) continue;
    try {
      await base44.asServiceRole.entities.Investment.update(inv.id, {
        price: q.price,
        previous_close: q.previous_close,
        daily_change: q.daily_change,
        daily_change_percent: q.daily_change_percent,
        currency: q.currency || inv.currency,
        data_source: 'mansa',
        last_updated: now,
        ...nextHistory(inv, q.price, today, null),
      });
      updated += 1;
      updatedSymbols.push(inv.ticker);
    } catch (_e) {
      failed += 1;
    }
  }
  await logProviderRequest(base44, {
    provider: 'mansa', category: 'bse_snapshot', status: 'success',
    http_status: 200, securities_updated: updated,
  });
  const status = updated > 0 ? 'updated' : (failed > 0 ? 'provider_error' : 'no_change');
  const message = updated > 0
    ? `BSE: refreshed ${updated} curated securities from the Mansa snapshot.`
    : 'BSE: no curated securities matched the Mansa snapshot — seeded prices retained.';
  return { status, attempted: true, updated, failed, updatedSymbols, stale_cache: updated === 0, message };
}

async function refreshBseIndex(base44: any, apiKey: string, now: string): Promise<void> {
  // Budget + freshness gate — index calls count toward the daily Mansa ceiling.
  const gate = await assertMansaRequestAllowed(base44, 'bse_index', INDEX_REFRESH_MIN_INTERVAL_MS);
  if (!gate.allowed) return; // conserve quota; cache retained

  try {
    const result = await fetchBseIndexHistory(apiKey, 'BSE', 'DCI', '1Y');
    await logProviderRequest(base44, {
      provider: 'mansa', category: 'bse_index',
      status: result.ok ? 'success' : 'error',
      http_status: result.httpStatus, error_summary: result.error,
    });
    if (!result.ok || !result.points.length) return;
    const existing = await base44.asServiceRole.entities.MarketIndex.filter({ code: 'BSE DCI' });
    const fields = {
      name: result.name, exchange: 'BSE', currency: 'BWP',
      points: result.points, last_value: result.last_value, last_updated: now,
    };
    if (existing[0]) {
      await base44.asServiceRole.entities.MarketIndex.update(existing[0].id, fields);
    } else {
      await base44.asServiceRole.entities.MarketIndex.create({ code: 'BSE DCI', ...fields });
    }
  } catch (_e) {
    // best-effort
  }
}

async function refreshFx(base44: any, apiKey: string, now: string): Promise<number | null> {
  const fresh = await recentFxRefresh(base44, FX_MIN_INTERVAL_MS);
  if (fresh) return null; // keep cached rate

  try {
    if (!(await reserveTwelveCredits(1))) return null;
    const result = await fetchUsdBwpRate(apiKey);
    await logProviderRequest(base44, {
      provider: 'twelve_data',
      category: 'fx_usd_bwp',
      status: result.ok ? 'success' : 'error',
      http_status: result.httpStatus,
    });
    if (result.ok && result.rate) {
      const existing = await base44.asServiceRole.entities.ExchangeRate.list('-last_updated', 10);
      const row = existing.find((r: any) => r.base === 'USD' && r.quote === 'BWP');
      if (row) {
        await base44.asServiceRole.entities.ExchangeRate.update(row.id, {
          rate: result.rate, source: 'twelve_data', last_updated: now,
        });
      } else {
        await base44.asServiceRole.entities.ExchangeRate.create({
          base: 'USD', quote: 'BWP', rate: result.rate, source: 'twelve_data', last_updated: now,
        });
      }
      return result.rate;
    }
  } catch (_e) {
    // keep cached / fallback rate
  }
  return null;
}

export async function runMarketRefresh(base44: any, config: { twelveDataKey: string | null; mansaKey: string | null }): Promise<any> {
  const now = new Date().toISOString();
  const result: {
    status: string;
    fetched_at: string;
    global: MarketRefreshSection;
    bse: MarketRefreshSection;
    fx_rate: number | null;
    message: string;
  } = {
    status: 'ok',
    fetched_at: now,
    global: { status: 'pending', attempted: false, updated: 0, failed: 0, message: '' },
    bse: { status: 'pending', attempted: false, updated: 0, failed: 0, message: '' },
    fx_rate: null,
    message: '',
  };

  if (!config.twelveDataKey) {
    result.global = {
      status: 'no_key', attempted: false, updated: 0, failed: 0, stale_cache: true,
      message: 'Global: Twelve Data API key not configured — seeded prices retained.',
    };
  } else {
    try {
      result.global = await refreshGlobal(base44, config.twelveDataKey, now);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'error';
      result.global = {
        status: 'provider_error', attempted: false, updated: 0, failed: 0, stale_cache: true,
        message: `Global: refresh failed (${errorMessage}). Cached prices retained.`,
      };
    }
  }

  if (!config.mansaKey) {
    result.bse = {
      status: 'no_key', attempted: false, updated: 0, failed: 0, stale_cache: true,
      message: 'BSE: Mansa API key not configured — seeded prices retained.',
    };
  } else {
    try {
      result.bse = await refreshBse(base44, config.mansaKey, now);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'error';
      result.bse = {
        status: 'provider_error', attempted: false, updated: 0, failed: 0, stale_cache: true,
        message: `BSE: refresh failed (${errorMessage}). Cached prices retained.`,
      };
    }
  }

  if (config.mansaKey) {
    await refreshBseIndex(base44, config.mansaKey, now);
  }

  if (config.twelveDataKey) {
    result.fx_rate = await refreshFx(base44, config.twelveDataKey, now);
  }

  const gs = result.global.status;
  const bs = result.bse.status;
  const anyUpdated = gs === 'updated' || bs === 'updated';
  const anyError = gs === 'provider_error' || bs === 'provider_error';
  if (gs === 'no_key' && bs === 'no_key') result.status = 'no_key';
  else if (anyError && !anyUpdated) result.status = 'provider_error';
  else if (anyError || gs === 'deferred' || bs === 'deferred' || gs === 'fresh' || bs === 'fresh') {
    result.status = anyUpdated ? 'partial' : (gs === 'fresh' || bs === 'fresh' ? 'ok' : 'partial');
  } else result.status = 'ok';

  result.message = `${result.global.message} ${result.bse.message}${result.fx_rate ? ` USD/BWP=${result.fx_rate}.` : ' USD/BWP unchanged.'}`;
  return result;
}
