import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';

// Server-side Auto-Invest plan CRUD. Execution remains in executeRecurringInvestment;
// this function only validates and persists plan rows so a modified client cannot
// set arbitrary amounts, investment ids, or account types.
//
// Actions:
//   create  — { investment_id, amount, frequency }
//   update  — { plan_id, investment_id?, amount?, frequency? }
//   toggle  — { plan_id }  (flips active)
//   delete  — { plan_id }

const FREQUENCIES = new Set(['weekly', 'bi-weekly', 'monthly']);

function nextDateFromFreq(freq: string): string {
  const d = new Date();
  if (freq === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (freq === 'bi-weekly') d.setUTCDate(d.getUTCDate() + 14);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function handler(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) || {};
    const action = (body.action || '').toString();
    const account_type = body.account_type === 'real' ? 'real' : 'demo';

    if (account_type === 'real') {
      return Response.json(
        { error: 'Auto-Invest is not yet available for the Real Account.' },
        { status: 400 },
      );
    }

    if (action === 'create') {
      const investment_id = (body.investment_id || '').toString();
      const amount = Number(body.amount);
      const frequency = (body.frequency || 'monthly').toString();

      if (!investment_id) {
        return Response.json({ error: 'An investment is required.' }, { status: 400 });
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return Response.json({ error: 'Enter a valid amount greater than P0.' }, { status: 400 });
      }
      if (!FREQUENCIES.has(frequency)) {
        return Response.json({ error: 'Choose a valid frequency.' }, { status: 400 });
      }

      const inv = await base44.asServiceRole.entities.Investment.get(investment_id);
      if (!inv) return Response.json({ error: 'Investment not found.' }, { status: 404 });

      const plan = await base44.entities.RecurringInvestment.create({
        ticker: inv.ticker,
        name: inv.name,
        investment_id: inv.id,
        amount,
        frequency,
        next_date: nextDateFromFreq(frequency),
        active: true,
        account_type: 'demo',
      });
      return Response.json({ ok: true, plan });
    }

    if (action === 'update') {
      const plan_id = (body.plan_id || '').toString();
      if (!plan_id) return Response.json({ error: 'A plan is required.' }, { status: 400 });

      const existing = await base44.entities.RecurringInvestment.get(plan_id);
      if (!existing) return Response.json({ error: 'Plan not found.' }, { status: 404 });
      if (existing.created_by_id && existing.created_by_id !== user.id) {
        return Response.json({ error: 'Forbidden.' }, { status: 403 });
      }

      const patch: Record<string, unknown> = {};

      if (body.investment_id !== undefined) {
        const investment_id = (body.investment_id || '').toString();
        if (!investment_id) {
          return Response.json({ error: 'An investment is required.' }, { status: 400 });
        }
        const inv = await base44.asServiceRole.entities.Investment.get(investment_id);
        if (!inv) return Response.json({ error: 'Investment not found.' }, { status: 404 });
        patch.investment_id = inv.id;
        patch.ticker = inv.ticker;
        patch.name = inv.name;
      }

      if (body.amount !== undefined) {
        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return Response.json({ error: 'Enter a valid amount greater than P0.' }, { status: 400 });
        }
        patch.amount = amount;
      }

      if (body.frequency !== undefined) {
        const frequency = (body.frequency || '').toString();
        if (!FREQUENCIES.has(frequency)) {
          return Response.json({ error: 'Choose a valid frequency.' }, { status: 400 });
        }
        patch.frequency = frequency;
        // Recalculate next run so a frequency change does not keep an obsolete schedule.
        patch.next_date = nextDateFromFreq(frequency);
      }

      if (Object.keys(patch).length === 0) {
        return Response.json({ error: 'No changes provided.' }, { status: 400 });
      }

      // Never allow client to flip account_type via update.
      patch.account_type = 'demo';

      const plan = await base44.entities.RecurringInvestment.update(plan_id, patch);
      return Response.json({ ok: true, plan });
    }

    if (action === 'toggle') {
      const plan_id = (body.plan_id || '').toString();
      if (!plan_id) return Response.json({ error: 'A plan is required.' }, { status: 400 });

      const existing = await base44.entities.RecurringInvestment.get(plan_id);
      if (!existing) return Response.json({ error: 'Plan not found.' }, { status: 404 });
      if (existing.created_by_id && existing.created_by_id !== user.id) {
        return Response.json({ error: 'Forbidden.' }, { status: 403 });
      }

      const plan = await base44.entities.RecurringInvestment.update(plan_id, {
        active: !existing.active,
      });
      return Response.json({ ok: true, plan, active: !existing.active });
    }

    if (action === 'delete') {
      const plan_id = (body.plan_id || '').toString();
      if (!plan_id) return Response.json({ error: 'A plan is required.' }, { status: 400 });

      const existing = await base44.entities.RecurringInvestment.get(plan_id);
      if (!existing) return Response.json({ error: 'Plan not found.' }, { status: 404 });
      if (existing.created_by_id && existing.created_by_id !== user.id) {
        return Response.json({ error: 'Forbidden.' }, { status: 403 });
      }

      await base44.entities.RecurringInvestment.delete(plan_id);
      return Response.json({ ok: true, deleted: plan_id });
    }

    return Response.json(
      { error: 'Unknown action. Use create, update, toggle, or delete.' },
      { status: 400 },
    );
  } catch (e) {
    return Response.json(
      { error: (e as Error)?.message || 'Could not manage Auto-Invest plan.' },
      { status: 400 },
    );
  }
}

serveFunction(handler);
