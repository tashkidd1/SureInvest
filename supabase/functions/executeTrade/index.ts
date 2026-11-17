import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
import { recordSnapshot } from '../_shared/snapshot.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
// Server-side validated simulated buy/sell. Financial mutation runs inside
// execute_trade_atomic (single Postgres transaction with cash-row lock and
// user-scoped client_ref idempotency).

function serviceRpcClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const action = body.action === 'sell' ? 'sell' : 'buy';
    const investment_id = (body.investment_id || '').toString();
    const units = Number(body.units);
    const client_ref = (body.client_ref || '').toString().slice(0, 80);
    const account_type = body.account_type === 'real' ? 'real' : 'demo';

    if (!investment_id) return Response.json({ error: 'An investment is required.' }, { status: 400 });
    if (!Number.isFinite(units) || units <= 0) {
      return Response.json({ error: 'Enter a valid number of units.' }, { status: 400 });
    }

    const sb = serviceRpcClient();
    const { data, error } = await sb.rpc('execute_trade_atomic', {
      p_user_id: user.id,
      p_action: action,
      p_investment_id: investment_id,
      p_units: units,
      p_account_type: account_type,
      p_client_ref: client_ref || null,
    });

    if (error) {
      return Response.json({ error: error.message || 'Trade failed' }, { status: 500 });
    }

    if (data?.error) {
      const status = Number(data.status) || 400;
      const { status: _s, ...payload } = data;
      return Response.json(payload, { status });
    }

    if (!data?.duplicate) {
      try {
        await recordSnapshot(base44, user.id, account_type);
      } catch (_e) { /* non-fatal */ }
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message || 'Trade failed' }, { status: 500 });
  }
}

serveFunction(handler);
