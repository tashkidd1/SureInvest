import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { recordSnapshot } from '../../shared/snapshot.ts';
// Contribute virtual cash toward a goal. All validation happens BEFORE any
// mutation. A goal that is already complete rejects contributions; an amount
// exceeding the remaining target is rejected (with structured info) rather
// than silently clamped — the frontend offers to contribute exactly the
// remaining amount. All records are created user-scoped so created_by_id is
// stamped to the calling user (RLS-safe). client_ref prevents duplicates.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    const goal_id = (body.goal_id || '').toString();
    const amount = Number(body.amount);
    const client_ref = (body.client_ref || '').toString().slice(0, 80);
    if (!goal_id) return Response.json({ error: 'A goal is required.' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'Enter a valid amount.' }, { status: 400 });
    // Account context — goals are a Demo-account feature for now; the backend
    // rejects Real-account contributions independently of the UI.
    const account_type = body.account_type === 'real' ? 'real' : 'demo';
    if (account_type === 'real') {
      return Response.json({ error: 'Goals are not yet available for the Real Account.' }, { status: 400 });
    }
    // Idempotency — never process the same client_ref twice.
    if (client_ref) {
      const dupe = await base44.asServiceRole.entities.Transaction.filter({ client_ref });
      if (dupe[0]) return Response.json({ ok: true, duplicate: true, message: 'This contribution was already processed.' });
    }
    // User-scoped lookups (RLS = caller's own). list() is reliable; compound
    // filters are not on this platform.
    const cashAccounts = await base44.entities.CashAccount.list("-created_date", 10);
    const cash = cashAccounts.find((c) => (c.account_type || 'demo') === account_type) || null;
    if (!cash) return Response.json({ error: 'No cash account found. Please complete onboarding first.' }, { status: 400 });
    let goal;
    try {
      goal = await base44.entities.Goal.get(goal_id); // RLS: 404 if not owned by caller
    } catch (_e) {
      goal = null;
    }
    if (!goal) return Response.json({ error: 'Goal not found.' }, { status: 404 });
    // Goal must belong to the same account space as the contribution.
    if ((goal.account_type || 'demo') !== account_type) return Response.json({ error: 'Goal not found.' }, { status: 404 });
    const target = Number(goal.target_amount) || 0;
    const current = Number(goal.current_amount) || 0;
    const remaining = target - current;
    // Rule 1 — completed goal: reject, do not deduct.
    if (current >= target) {
      return Response.json({
        error: 'This goal has already been completed.',
        completed: true, remaining: 0, target, current,
      }, { status: 400 });
    }
    // Rule 3 — over-contribution: reject, do not deduct or clamp. Return
    // structured info so the frontend can offer to contribute exactly the
    // remaining amount.
    if (amount > remaining) {
      return Response.json({
        error: `Only P${remaining.toFixed(2)} is needed to complete this goal.`,
        over: true, remaining, requested: amount, target, current,
      }, { status: 400 });
    }
    // Rule 2 — valid contribution: check cash sufficiency, then mutate.
    if (Number(cash.balance) < amount) {
      return Response.json({ error: 'Insufficient cash for this contribution.' }, { status: 400 });
    }
    const newBalance = Number(cash.balance) - amount;
    const newCurrent = current + amount;
    const completed = newCurrent >= target;
    await base44.entities.CashAccount.update(cash.id, { balance: newBalance, available: newBalance });
    await base44.entities.Goal.update(goal.id, {
      current_amount: newCurrent,
      status: completed ? 'completed' : 'active',
    });
    await base44.entities.GoalContribution.create({
      goal_id, goal_name: goal.name, amount, account_type,
    });
    await base44.entities.Transaction.create({
      type: 'goal_contribution',
      amount: -amount,
      currency: 'BWP',
      fx_rate: 1,
      fees: 0,
      status: 'completed',
      description: `Contribution to ${goal.name}`,
      client_ref: client_ref || undefined,
      account_type,
    });
    await base44.entities.Notification.create({
      title: completed ? `Goal completed: ${goal.name}` : 'Goal contribution',
      body: completed
        ? `Your goal "${goal.name}" has reached its target of P${target.toFixed(2)}.`
        : `P${amount.toFixed(2)} added to "${goal.name}".`,
      type: 'goal',
    });
    await recordSnapshot(base44, user.id, account_type);
    return Response.json({
      ok: true, amount, cash_balance: newBalance,
      goal_current: newCurrent, goal_target: target,
      completed, remaining: target - newCurrent,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Contribution failed' }, { status: 500 });
  }
}
