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
  return createClient(url, getSupabaseSecretKey('superkey'));
}

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Fast-path the shared scheduler secret before attempting user-JWT
    // validation. A CRON_SECRET is not a Supabase user access token.
    let user: { id: string; email?: string; role: string } | null = null;
    let gate = requireSchedulerOrAdmin(req, null);
    if (!gate.ok) {
      try { user = await base44.auth.me(); } catch (_e) { user = null; }
      gate = requireSchedulerOrAdmin(req, user);
    }
    if (!gate.ok) return gate.response;

    const today = new Date().toISOString().slice(0, 10);
    let body: { force?: boolean } = {};
    try { body = await req.json(); } catch (_e) { /* no body / cron sends {} */ }

    const activePlans = await base44.asServiceRole.entities.RecurringInvestment.filter({ active: true });
    let due = activePlans.filter((p: any) => (p.next_date || '') <= today);

    if (body?.force) {
      if (gate.mode !== 'admin' || !user) {
        return Response.json({ error: 'force requires an authenticated admin.' }, { status: 403 });
      }
      // Test mode: ignore next_date, but only for this admin's own plans.
      due = activePlans.filter((p: any) => p.created_by_id === user.id);
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Auto-Invest run failed.';
    return Response.json({ error: message }, { status: 500 });
  }
}

serveFunction(handler);
