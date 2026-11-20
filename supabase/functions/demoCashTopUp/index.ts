import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOP_UP_AMOUNT = 5000;

function serviceRpcClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

// Atomic demo cash top-up via demo_cash_topup_atomic (row lock + optional client_ref).
async function handler(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const client_ref = (body.client_ref || '').toString().slice(0, 80) || null;

    const sb = serviceRpcClient();
    const { data, error } = await sb.rpc('demo_cash_topup_atomic', {
      p_user_id: user.id,
      p_amount: TOP_UP_AMOUNT,
      p_client_ref: client_ref,
    });

    if (error) {
      return Response.json({ error: error.message || 'Could not add demo cash.' }, { status: 400 });
    }
    if (data?.error) {
      const status = Number(data.status) || 400;
      const { status: _s, ...payload } = data;
      return Response.json(payload, { status });
    }

    // If balance omitted on duplicate, fetch current for the client UI.
    if (data?.duplicate && data.balance == null) {
      const accounts = await base44.entities.CashAccount.filter(
        { created_by_id: user.id, account_type: 'demo' },
        '-created_date',
        1,
      );
      data.balance = Number(accounts[0]?.balance) || 0;
    }

    return Response.json(data);
  } catch (e) {
    return Response.json({ error: (e as Error)?.message || 'Could not add demo cash.' }, { status: 400 });
  }
}

serveFunction(handler);
