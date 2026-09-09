import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { runMarketRefresh } from '../../shared/marketData/service.ts';
// Unified market-data refresh entry point. Delegates all provider interaction
// (Twelve Data → Global, Mansa → BSE), budgeting, logging and cache writes to
// the MarketDataService. Scheduled (cron) runs have no authenticated user and
// are allowed; manual HTTP triggers must come from an admin.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.log(`[refreshMarketData] trigger=${user ? 'manual' : 'scheduled'}`);
    const result = await runMarketRefresh(base44, {
      twelveDataKey: secrets.get('TWELVE_DATA_API_KEY') || null,
      mansaKey: secrets.get('MANSA_API_KEY') || null,
    });
    console.log(`[refreshMarketData] status=${result.status} global=${result.global.status}/${result.global.updated} bse=${result.bse.status}/${result.bse.updated} fx=${result.fx_rate ?? 'unchanged'}`);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message || 'Refresh failed', status: 'error' }, { status: 500 });
  }
}
