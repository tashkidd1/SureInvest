import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
import { secrets } from '../_shared/base44Compat.ts';
import { runMarketRefresh } from '../_shared/marketData/service.ts';
import { requireSchedulerOrAdmin } from '../_shared/schedulerAuth.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

function serviceRpcClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    const gate = requireSchedulerOrAdmin(req, user);
    if (!gate.ok) return gate.response;

    const ownerToken = crypto.randomUUID();
    const sb = serviceRpcClient();
    const { data: acquired, error: lockError } = await sb.rpc('acquire_market_data_refresh_lock', {
      p_lock_key: 'refresh-market-data', p_owner_token: ownerToken, p_lease_seconds: 900,
    });
    if (lockError) throw new Error(`Could not acquire market refresh lock: ${lockError.message}`);
    if (acquired !== true) {
      return Response.json({
        status: 'busy',
        message: 'A market refresh is already in progress — cached prices retained.',
        auth_mode: gate.mode,
      }, { status: 429 });
    }

    try {
      console.log(`[refreshMarketData] trigger=${gate.mode}`);
      const result = await runMarketRefresh(base44, {
        twelveDataKey: secrets.get('TWELVE_DATA_API_KEY') || null,
        mansaKey: secrets.get('MANSA_API_KEY') || null,
      });
      console.log(`[refreshMarketData] status=${result.status} global=${result.global?.status}/${result.global?.updated} bse=${result.bse?.status}/${result.bse?.updated} fx=${result.fx_rate ?? 'unchanged'}`);
      return Response.json({ ...result, auth_mode: gate.mode });
    } finally {
      const { error: releaseError } = await sb.rpc('release_market_data_refresh_lock', {
        p_lock_key: 'refresh-market-data', p_owner_token: ownerToken,
      });
      if (releaseError) console.error('[refreshMarketData] lock release failed', releaseError.message);
    }
  } catch (error) {
    return Response.json({ error: error.message || 'Refresh failed', status: 'error' }, { status: 500 });
  }
}

serveFunction(handler);
