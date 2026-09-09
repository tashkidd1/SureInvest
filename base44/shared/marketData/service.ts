// MarketDataService — provider-independent refresh orchestration. Coordinates
// the Twelve Data (global) and Mansa (BSE) providers, applies the centralized
// request budget, writes the Investment / ExchangeRate caches, and returns a
// unified result. Provider failures are isolated: one provider failing never
// blocks or corrupts the other, and cached prices are always retained.
import { fetchQuotes, fetchUsdBwpRate } from './twelveDataProvider.ts';
import { fetchBseSnapshot, toMansaTicker } from './mansaProvider.ts';
import { checkMansaBudget, recentBseSnapshot, logProviderRequest } from './requestBudget.ts';
// Locked Global Market V1 set. Free Twelve Data plan = 8 API credits/minute; a
// batched /quote counts one credit per symbol, so only the PER_CALL stalest
// symbols are refreshed each run — repeated calls rotate through the set.
const GLOBAL_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'KO', 'AMZN', 'SPY', 'VXUS', 'VNQ', 'VIG', 'BTC/USD'];
const GLOBAL_PER_CALL = 6;
async function refreshGlobal(base44, apiKey, now) {
  const rows = await base44.asServiceRole.entities.Investment.filter({ market: 'global' });
  const targets = rows
    .filter((r) => GLOBAL_SYMBOLS.includes(r.ticker))
    .sort((a, b) => (a.last_updated || '').localeCompare(b.last_updated || ''))
    .slice(0, GLOBAL_PER_CALL);
  if (!targets.length) {
    return { status: 'no_change', attempted: [], updated: 0, failed: 0, message: 'No global symbols found to refresh.' };
  }
  const symbols = targets.map((t) => t.ticker);
  const result = await fetchQuotes(apiKey, symbols);
  await logProviderRequest(base44, {
    provider: 'twelve_data', category: 'global_quotes',
    status: result.ok ? 'success' : 'error',
    http_status: result.httpStatus,
    error_summary: result.error,
  });
  if (!result.ok) {
    return { status: 'provider_error', attempted: symbols, updated: 0, failed: symbols.length, message: `${result.error}. Cached / seeded prices retained.` };
  }
  let updated = 0;
  let failed = 0;
  const updatedSymbols = [];
  for (const inv of targets) {
    const q = result.quotes[inv.ticker];
    if (!q) { failed += 1; continue; }
    try {
      await base44.asServiceRole.entities.Investment.update(inv.id, {
        price: q.price,
        previous_close: q.previous,
        daily_change: q.change,
        daily_change_percent: q.percent,
        currency: q.currency || inv.currency,
        data_source: 'twelve_data',
        last_updated: now,
      });
      updated += 1;
      updatedSymbols.push(inv.ticker);
    } catch (_e) {
      // per-symbol failure: keep existing cache for this symbol
      failed += 1;
    }
  }
  const status = updated > 0 ? 'updated' : (failed > 0 ? 'provider_error' : 'no_change');
  return { status, attempted: symbols, updated, failed, updatedSymbols, message: `Global: refreshed ${updated}/${symbols.length} prices (stalest ${GLOBAL_PER_CALL} of ${GLOBAL_SYMBOLS.length}).` };
}
async function refreshBse(base44, apiKey, now) {
  // Conserve quota: skip if a fresh snapshot was already ingested recently
  // (Mansa snapshots refresh every 30 minutes).
  const fresh = await recentBseSnapshot(base44);
  if (fresh) {
    return { status: 'fresh', attempted: false, updated: 0, failed: 0, message: `BSE: snapshot ingested ${fresh.ageMinutes} min ago — cached prices retained (quota conserved).` };
  }
  const budget = await checkMansaBudget(base44);
  if (!budget.allowed) {
    return { status: 'deferred', attempted: false, updated: 0, failed: 0, message: `BSE: Mansa daily budget reached (${budget.used}/${budget.ceiling}) — cached prices retained.` };
  }
  // One shared snapshot request covers the whole exchange (and the active
  // SureInvest basket of curated BSE securities).
  const result = await fetchBseSnapshot(apiKey);
  if (!result.ok) {
    await logProviderRequest(base44, {
      provider: 'mansa', category: 'bse_snapshot', status: 'error',
      http_status: result.httpStatus, error_summary: result.error,
    });
    return { status: 'provider_error', attempted: true, updated: 0, failed: 0, message: `BSE: ${result.error}. Cached prices retained.` };
  }
  // Match quotes to EXISTING curated Investment rows only — never create,
  // duplicate or replace catalogue records.
  const rows = await base44.asServiceRole.entities.Investment.filter({ market: 'botswana' });
  let updated = 0;
  let failed = 0;
  const updatedSymbols = [];
  for (const inv of rows) {
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
  return { status, attempted: true, updated, failed, updatedSymbols, message };
}
// USD/BWP FX refresh (Twelve Data, independent of the global quotes outcome).
// Any failure keeps the cached/fallback rate — never zeroed.
async function refreshFx(base44, apiKey, now) {
  try {
    const result = await fetchUsdBwpRate(apiKey);
    if (result.ok && result.rate) {
      const existing = await base44.asServiceRole.entities.ExchangeRate.list('-last_updated', 10);
      const row = existing.find((r) => r.base === 'USD' && r.quote === 'BWP');
      if (row) {
        await base44.asServiceRole.entities.ExchangeRate.update(row.id, { rate: result.rate, source: 'twelve_data', last_updated: now });
      } else {
        await base44.asServiceRole.entities.ExchangeRate.create({ base: 'USD', quote: 'BWP', rate: result.rate, source: 'twelve_data', last_updated: now });
      }
      return result.rate;
    }
  } catch (_e) {
    // keep cached / fallback rate
  }
  return null;
}
// Unified refresh entry point. Returns a result that distinguishes each
// provider's outcome so callers (manual button or future automation) can
// report them independently.
export async function runMarketRefresh(base44, config) {
  const now = new Date().toISOString();
  const result = {
    status: 'ok',
    fetched_at: now,
    global: null,
    bse: null,
    fx_rate: null,
    message: '',
  };
  // Global — Twelve Data
  if (!config.twelveDataKey) {
    result.global = { status: 'no_key', attempted: false, updated: 0, failed: 0, message: 'Global: Twelve Data API key not configured — seeded prices retained.' };
  } else {
    try {
      result.global = await refreshGlobal(base44, config.twelveDataKey, now);
    } catch (e) {
      result.global = { status: 'provider_error', attempted: false, updated: 0, failed: 0, message: `Global: refresh failed (${e.message || 'error'}). Cached prices retained.` };
    }
  }
  // BSE — Mansa
  if (!config.mansaKey) {
    result.bse = { status: 'no_key', attempted: false, updated: 0, failed: 0, message: 'BSE: Mansa API key not configured — seeded prices retained.' };
  } else {
    try {
      result.bse = await refreshBse(base44, config.mansaKey, now);
    } catch (e) {
      result.bse = { status: 'provider_error', attempted: false, updated: 0, failed: 0, message: `BSE: refresh failed (${e.message || 'error'}). Cached prices retained.` };
    }
  }
  // FX — Twelve Data (preserved existing behaviour)
  if (config.twelveDataKey) {
    result.fx_rate = await refreshFx(base44, config.twelveDataKey, now);
  }
  // Unified status across providers
  const gs = result.global.status;
  const bs = result.bse.status;
  const anyUpdated = gs === 'updated' || bs === 'updated';
  const anyError = gs === 'provider_error' || bs === 'provider_error';
  if (gs === 'no_key' && bs === 'no_key') result.status = 'no_key';
  else if (anyError && !anyUpdated) result.status = 'provider_error';
  else if (anyError || gs === 'deferred' || bs === 'deferred') result.status = 'partial';
  else result.status = 'ok';
  result.message = `${result.global.message} ${result.bse.message}${result.fx_rate ? ` USD/BWP=${result.fx_rate}.` : ' USD/BWP unchanged.'}`;
  return result;
}
