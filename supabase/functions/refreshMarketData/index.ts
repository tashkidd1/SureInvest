import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest, createSupabaseServiceClient, secrets } from '../_shared/base44Compat.ts';
import { runMarketRefresh } from '../_shared/marketData/service.ts';
import { requireSchedulerOrAdmin } from '../_shared/schedulerAuth.ts';

function serviceRpcClient() {
  return createSupabaseServiceClient();
}

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Fast-path the shared scheduler secret before attempting user-JWT
    // validation. A CRON_SECRET is not a Supabase user access token.
    let gate = requireSchedulerOrAdmin(req, null);
    if (!gate.ok) {
      let user: { id: string; email?: string; role: string } | null = null;
      try { user = await base44.auth.me(); } catch (_e) { user = null; }
      gate = requireSchedulerOrAdmin(req, user);
    }
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Refresh failed';
    return Response.json({ error: message, status: 'error' }, { status: 500 });
  }
}

serveFunction(handler);
