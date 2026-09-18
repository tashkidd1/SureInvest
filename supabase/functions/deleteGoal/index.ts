import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';

// Server-side goal deletion. Load via user-scoped client (RLS select), then
// delete via service role so client write policies can be removed safely.
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

    await base44.asServiceRole.entities.Goal.delete(goal_id);
    return Response.json({ ok: true, deleted: goal_id });
  } catch (e) {
    return Response.json(
      { error: (e as Error)?.message || 'Could not delete goal.' },
      { status: 400 },
    );
  }
}

serveFunction(handler);
