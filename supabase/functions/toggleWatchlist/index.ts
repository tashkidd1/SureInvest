import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
// Idempotent, server-validated watchlist toggle. Enforces one watchlist row
// per (user, investment): if a row already exists for this investment it is
// removed; otherwise it is created. Any legacy duplicate rows for the same
// investment are collapsed on every call. All operations are user-scoped so
// created_by_id is stamped correctly (RLS-safe) and only the caller's own
// watchlist is touched.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    const investment_id = (body.investment_id || '').toString();
    if (!investment_id) return Response.json({ error: 'An investment is required.' }, { status: 400 });
    const inv = await base44.asServiceRole.entities.Investment.get(investment_id);
    if (!inv) return Response.json({ error: 'Investment not found.' }, { status: 404 });
    // All existing rows for this user + investment (may include legacy dupes).
    const rows = await base44.entities.Watchlist.filter({ investment_id });
    if (rows[0]) {
      // Remove every matching row (dedup) and report as unwatched.
      await Promise.all(rows.map((r) => base44.entities.Watchlist.delete(r.id)));
      return Response.json({ ok: true, watched: false, removed: rows.length, item: null });
    }
    // Fallback match by ticker if investment_id wasn't back-filled on a legacy row.
    const byTicker = await base44.entities.Watchlist.filter({ ticker: inv.ticker });
    if (byTicker[0]) {
      await Promise.all(byTicker.map((r) => base44.entities.Watchlist.delete(r.id)));
      return Response.json({ ok: true, watched: false, removed: byTicker.length, item: null });
    }
    const item = await base44.entities.Watchlist.create({
      ticker: inv.ticker,
      name: inv.name,
      category: inv.category,
      market: inv.market,
      price: inv.price,
      daily_change_percent: inv.daily_change_percent ?? 0,
      investment_id: inv.id,
    });
    return Response.json({ ok: true, watched: true, item });
  } catch (error) {
    return Response.json({ error: error?.message || 'Watchlist toggle failed.' }, { status: 500 });
  }
}

serveFunction(handler);
