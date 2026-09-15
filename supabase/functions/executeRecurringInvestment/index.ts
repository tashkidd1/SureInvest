import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
import { getUsdBwpRate, nativeToBwp } from '../_shared/currency.ts';
import { recordSnapshotForUser } from '../_shared/snapshot.ts';
// Scheduled job (not user-invoked): executes every active RecurringInvestment
// plan whose next_date has arrived. Auto-Invest is a Demo-account feature for
// now, same as Goals and executeTrade's Real-account gate.
//
// Also callable directly by an admin with body {"force": true} to test their
// own plan(s) immediately, without waiting for the real weekly/bi-weekly/
// monthly interval — scoped to that admin's own plans only, so testing never
// executes another user's schedule early.
function addFrequency(dateStr, freq) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (freq === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (freq === 'bi-weekly') d.setUTCDate(d.getUTCDate() + 14);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().slice(0, 10);
    let body = {};
    try { body = await req.json(); } catch (_e) { /* no body / cron sends {} */ }
    const activePlans = await base44.asServiceRole.entities.RecurringInvestment.filter({ active: true });
    let due = activePlans.filter((p) => (p.next_date || '') <= today);
    if (body?.force) {
      const me = await base44.auth.me();
      if (me?.role === 'admin') {
        // Test mode: ignore next_date, but only for this admin's own plans.
        due = activePlans.filter((p) => p.created_by_id === me.id);
      }
    }
    const rate = await getUsdBwpRate(base44);
    let executed = 0;
    let skipped = 0;
    let failed = 0;
    for (const plan of due) {
      try {
        const inv = await base44.asServiceRole.entities.Investment.get(plan.investment_id);
        if (!inv || !(Number(inv.price) > 0)) { failed += 1; continue; }
        const client_ref = `autoinvest-${plan.id}-${plan.next_date}`;
        const dupe = await base44.asServiceRole.entities.Transaction.filter({ client_ref });
        if (dupe[0]) continue; // already executed this cycle (e.g. an overlapping run)
        const cashRows = await base44.asServiceRole.entities.CashAccount.filter({
          created_by_id: plan.created_by_id, account_type: 'demo',
        });
        const cash = cashRows[0];
        const amount = Number(plan.amount) || 0;
        if (!cash || Number(cash.balance) < amount) {
          // Insufficient funds this cycle: skip (don't deduct/invest), notify
          // once, and still advance the schedule so it doesn't re-fire and
          // spam a notification every cron tick until funded again.
          await base44.asServiceRole.entities.Notification.create({
            created_by_id: plan.created_by_id,
            title: 'Auto-Invest skipped',
            body: `Not enough cash for the P${amount.toFixed(2)} auto-invest into ${plan.ticker} this cycle.`,
            type: 'warning',
          });
          await base44.asServiceRole.entities.RecurringInvestment.update(plan.id, {
            next_date: addFrequency(plan.next_date, plan.frequency),
          });
          skipped += 1;
          continue;
        }
        const price = Number(inv.price);
        const pricePerUnitBwp = nativeToBwp(price, inv.currency, rate);
        const units = pricePerUnitBwp > 0 ? amount / pricePerUnitBwp : 0;
        if (!(units > 0)) { failed += 1; continue; }
        const newBalance = Number(cash.balance) - amount;
        await base44.asServiceRole.entities.CashAccount.update(cash.id, { balance: newBalance, available: newBalance });
        const holdingRows = await base44.asServiceRole.entities.Holding.filter({
          created_by_id: plan.created_by_id, account_type: 'demo', investment_id: inv.id,
        });
        const existing = holdingRows[0];
        if (existing) {
          const totalUnits = Number(existing.units) + units;
          const totalCostNative = Number(existing.units) * Number(existing.avg_cost) + units * price;
          const newAvg = totalUnits > 0 ? totalCostNative / totalUnits : price;
          const existingAvgBwp = Number(existing.avg_cost_bwp) || pricePerUnitBwp;
          const totalCostBwp = Number(existing.units) * existingAvgBwp + units * pricePerUnitBwp;
          const newAvgBwp = totalUnits > 0 ? totalCostBwp / totalUnits : pricePerUnitBwp;
          await base44.asServiceRole.entities.Holding.update(existing.id, {
            units: totalUnits, avg_cost: newAvg, avg_cost_bwp: newAvgBwp,
            current_price: price, currency: inv.currency,
          });
        } else {
          await base44.asServiceRole.entities.Holding.create({
            created_by_id: plan.created_by_id, ticker: inv.ticker, name: inv.name,
            investment_id: inv.id, units, avg_cost: price, avg_cost_bwp: pricePerUnitBwp,
            current_price: price, currency: inv.currency, sector: inv.sector, account_type: 'demo',
          });
        }
        await base44.asServiceRole.entities.Transaction.create({
          created_by_id: plan.created_by_id, type: 'buy', ticker: inv.ticker, name: inv.name,
          units, price, currency: inv.currency, fx_rate: rate, fees: 0, amount: -amount,
          status: 'completed', description: `Auto-Invest: ${plan.ticker}`, account_type: 'demo',
          client_ref: `autoinvest-${plan.id}-${plan.next_date}`,
        });
        await base44.asServiceRole.entities.Notification.create({
          created_by_id: plan.created_by_id,
          title: 'Auto-Invest executed',
          body: `P${amount.toFixed(2)} invested into ${plan.ticker}.`,
          type: 'trade',
        });
        await base44.asServiceRole.entities.RecurringInvestment.update(plan.id, {
          next_date: addFrequency(plan.next_date, plan.frequency),
        });
        await recordSnapshotForUser(base44, plan.created_by_id, 'demo');
        executed += 1;
      } catch (_e) {
        failed += 1;
      }
    }
    return Response.json({ ok: true, checked: due.length, executed, skipped, failed });
  } catch (error) {
    return Response.json({ error: error?.message || 'Auto-Invest run failed.' }, { status: 500 });
  }
}

serveFunction(handler);
