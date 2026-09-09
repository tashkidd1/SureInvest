import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
// Server-side validated goal creation. The backend independently enforces the
// same rules the UI applies, so a modified client cannot bypass them:
//   - name: required, 1-50 characters after trimming
//   - target_amount: finite number > 0
//   - target_date: optional calendar date (YYYY-MM-DD), never in the past
//   - account context: goals are a Demo-account feature for now
// The past-date check treats the target as a calendar date and compares it
// against "today" in the app's home timezone (CAT, UTC+2 — matching the BWP /
// Botswana user base), so a local user can always select today's date while
// any genuinely past date is still rejected.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    const name = (body.name || '').toString().trim();
    const target_amount = Number(body.target_amount);
    const target_date = (body.target_date || '').toString().slice(0, 10);
    const category = ['retirement', 'education', 'home', 'emergency', 'wealth', 'other'].includes(body.category)
      ? body.category
      : 'wealth';
    const account_type = body.account_type === 'real' ? 'real' : 'demo';
    if (account_type === 'real') {
      return Response.json({ error: 'Goals are not yet available for the Real Account.' }, { status: 400 });
    }
    if (!name) return Response.json({ error: 'Goal name is required.' }, { status: 400 });
    if (name.length > 50) return Response.json({ error: 'Goal name must be 50 characters or fewer.' }, { status: 400 });
    if (!Number.isFinite(target_amount) || target_amount <= 0) {
      return Response.json({ error: 'Enter a valid target amount.' }, { status: 400 });
    }
    if (target_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
        return Response.json({ error: 'Enter a valid target date.' }, { status: 400 });
      }
      const todayCat = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (target_date < todayCat) {
        return Response.json({ error: 'Target date cannot be in the past.' }, { status: 400 });
      }
    }
    const goal = await base44.entities.Goal.create({
      name,
      target_amount,
      current_amount: 0,
      target_date: target_date || undefined,
      category,
      priority: 'medium',
      status: 'active',
      account_type: 'demo',
    });
    return Response.json({ ok: true, goal });
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not create goal.' }, { status: 500 });
  }
}
