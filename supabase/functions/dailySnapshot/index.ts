import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
import { recordSnapshotForUser } from '../_shared/snapshot.ts';
// Scheduled job (not user-invoked): takes a snapshot for every user/account
// space that has a cash account, using current market prices, regardless of
// whether that user traded today. Fixes the gap where snapshots previously
// only happened as a side effect of a trade or goal contribution, leaving a
// passive holder's performance chart blank on days they didn't act.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    // No RLS-scoped "caller" in a scheduled job — asServiceRole sees every
    // user's cash accounts, which is also the full roster of onboarded users.
    const cashAccounts = await base44.asServiceRole.entities.CashAccount.list();
    const seen = new Set();
    let created = 0;
    let failed = 0;
    for (const acc of cashAccounts) {
      const key = `${acc.created_by_id}:${acc.account_type || 'demo'}`;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        await recordSnapshotForUser(base44, acc.created_by_id, acc.account_type || 'demo');
        created += 1;
      } catch (_e) {
        failed += 1;
      }
    }
    return Response.json({ ok: true, accounts_snapshotted: created, failed, total: seen.size });
  } catch (error) {
    return Response.json({ error: error?.message || 'Snapshot job failed.' }, { status: 500 });
  }
}

serveFunction(handler);
