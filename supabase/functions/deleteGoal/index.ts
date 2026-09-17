import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';

// Server-side goal deletion. Ownership is enforced via RLS on the user-scoped
// client; we still load the row first so we can return a clear 404 and refuse
// cross-user deletes if created_by_id is present. Contribution history is left
// intact (ledger) — only the goal row is removed.
async function handler(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) || {};
    const goal_id = (body.goal_id || body.id || '').toString();
    if (!goal_id) return Response.json({ error: 'A goal is required.' }, { status: 400 });

    const goal = await base44.entities.Goal.get(goal_id);
    if (!goal) return Response.json({ error: 'Goal not found.' }, { status: 404 });
    if (goal.created_by_id && goal.created_by_id !== user.id) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await base44.entities.Goal.delete(goal_id);
    return Response.json({ ok: true, deleted: goal_id });
  } catch (e) {
    return Response.json(
      { error: (e as Error)?.message || 'Could not delete goal.' },
      { status: 400 },
    );
  }
}

serveFunction(handler);
