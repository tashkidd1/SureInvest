import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest, getSupabaseSecretKey } from '../_shared/base44Compat.ts';
import { recordSnapshotForUser } from '../_shared/snapshot.ts';
import { requireSchedulerOrAdmin } from '../_shared/schedulerAuth.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
// Scheduled job (not user-invoked): executes every active RecurringInvestment
// plan whose next_date has arrived. Auto-Invest is a Demo-account feature for
// now, same as Goals and executeTrade's Real-account gate.
//
// Auth: CRON_SECRET bearer, or admin. Admin may pass {"force": true} to run
// only their own plans immediately (test mode).
//
// Each plan runs inside execute_recurring_plan_atomic (row locks + idempotent
// client_ref autoinvest-<planId>-<cycleDate>).

function serviceRpcClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    const gate = requireSchedulerOrAdmin(req, user);
    if (!gate.ok) return gate.response;

    const today = new Date().toISOString().slice(0, 10);
    let body = {};
    try { body = await req.json(); } catch (_e) { /* no body / cron sends {} */ }

    const activePlans = await base44.asServiceRole.entities.RecurringInvestment.filter({ active: true });
    let due = activePlans.filter((p) => (p.next_date || '') <= today);

    if (body?.force) {
      if (gate.mode !== 'admin' || !user) {
        return Response.json({ error: 'force requires an authenticated admin.' }, { status: 403 });
      }
      // Test mode: ignore next_date, but only for this admin's own plans.
      due = activePlans.filter((p) => p.created_by_id === user.id);
    }

    const sb = serviceRpcClient();
    let executed = 0;
    let skipped = 0;
    let failed = 0;
    let duplicates = 0;

    for (const plan of due) {
      try {
        const cycleDate = body?.force ? today : (plan.next_date || today);
        const { data, error } = await sb.rpc('execute_recurring_plan_atomic', {
          p_plan_id: plan.id,
          p_cycle_date: cycleDate,
        });
        if (error) {
          failed += 1;
          continue;
        }
        const status = data?.status;
        if (status === 'executed') {
          executed += 1;
          try {
            await recordSnapshotForUser(base44, data.user_id || plan.created_by_id, 'demo');
          } catch (_e) { /* non-fatal */ }
        } else if (status === 'skipped') {
          skipped += 1;
        } else if (status === 'duplicate') {
          duplicates += 1;
        } else {
          failed += 1;
        }
      } catch (_e) {
        failed += 1;
      }
    }

    return Response.json({
      ok: true,
      checked: due.length,
      executed,
      skipped,
      failed,
      duplicates,
      auth_mode: gate.mode,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Auto-Invest run failed.' }, { status: 500 });
  }
}

serveFunction(handler);
