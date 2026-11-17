import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
import { secrets } from '../_shared/base44Compat.ts';
import { runMarketRefresh } from '../_shared/marketData/service.ts';
import { requireSchedulerOrAdmin } from '../_shared/schedulerAuth.ts';
// Unified market-data refresh entry point. Delegates all provider interaction
// (Twelve Data → Global, Mansa → BSE), budgeting, logging and cache writes to
// the MarketDataService.
//
// Auth: CRON_SECRET bearer token (scheduled), or authenticated admin (manual).
// Anonymous requests are rejected.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    const gate = requireSchedulerOrAdmin(req, user);
    if (!gate.ok) return gate.response;

    console.log(`[refreshMarketData] trigger=${gate.mode}`);
    const result = await runMarketRefresh(base44, {
      twelveDataKey: secrets.get('TWELVE_DATA_API_KEY') || null,
      mansaKey: secrets.get('MANSA_API_KEY') || null,
    });
    console.log(`[refreshMarketData] status=${result.status} global=${result.global.status}/${result.global.updated} bse=${result.bse.status}/${result.bse.updated} fx=${result.fx_rate ?? 'unchanged'}`);
    return Response.json({ ...result, auth_mode: gate.mode });
  } catch (error) {
    return Response.json({ error: error.message || 'Refresh failed', status: 'error' }, { status: 500 });
  }
}

serveFunction(handler);
