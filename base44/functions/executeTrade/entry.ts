import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { recordSnapshot } from '../../shared/snapshot.ts';
import { getUsdBwpRate, nativeToBwp } from '../../shared/currency.ts';
// Server-side validated simulated buy/sell with multi-currency support. The
// asset price stays in its native currency (USD/BWP); the BWP cash impact is
// computed server-side from the trusted cached USD/BWP rate. The client never
// supplies the rate or BWP totals. client_ref keeps the order idempotent.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    const action = body.action === 'sell' ? 'sell' : 'buy';
    const investment_id = (body.investment_id || '').toString();
    const units = Number(body.units);
    const client_ref = (body.client_ref || '').toString().slice(0, 80);
    if (!investment_id) return Response.json({ error: 'An investment is required.' }, { status: 400 });
    if (!Number.isFinite(units) || units <= 0) return Response.json({ error: 'Enter a valid number of units.' }, { status: 400 });
    // Account context — Demo (virtual simulation) or Real. Real-account trading
    // is NOT enabled yet; the backend rejects it independently of the UI.
    const account_type = body.account_type === 'real' ? 'real' : 'demo';
    if (account_type === 'real') {
      return Response.json({ error: 'Real account trading is not yet enabled.' }, { status: 400 });
    }
    // Idempotency guard — never execute the same client_ref twice.
    if (client_ref) {
      const dupe = await base44.asServiceRole.entities.Transaction.filter({ client_ref });
      if (dupe[0]) {
        return Response.json({
          ok: true,
          duplicate: true,
          action: dupe[0].type,
          units: dupe[0].units,
          price: dupe[0].price,
          total: Math.abs(dupe[0].amount),
          message: 'This order was already processed.',
        });
      }
    }
    const inv = await base44.asServiceRole.entities.Investment.get(investment_id);
    if (!inv) return Response.json({ error: 'Investment not found.' }, { status: 404 });
    const price = Number(inv.price) || 0;
    if (price <= 0) return Response.json({ error: 'No price available for this investment.' }, { status: 400 });
    const currency = inv.currency || 'BWP';
    // Trusted cached USD/BWP rate (guaranteed > 0). BWP assets use rate 1.
    const fx_rate = currency === 'BWP' ? 1 : await getUsdBwpRate(base44);
    const native_total = price * units;
    const bwp_total = nativeToBwp(native_total, currency, fx_rate);
    // User-scoped list is RLS-reliable; the platform documents compound
    // filter({ created_by_id, ... }) as unreliable, which previously caused
    // repeat buys to create duplicate holdings instead of merging.
    const cashAccounts = await base44.entities.CashAccount.list("-created_date", 10);
    const cash = cashAccounts.find((c) => (c.account_type || 'demo') === account_type) || null;
    if (!cash) return Response.json({ error: 'No cash account found. Please complete onboarding first.' }, { status: 400 });
    const allHoldings = await base44.entities.Holding.list("-created_date", 200);
    // Primary relationship is investment_id; ticker is a legacy fallback.
    const matches = allHoldings.filter((h) => (h.account_type || 'demo') === account_type && (h.investment_id === inv.id || h.ticker === inv.ticker));
    let holding = matches[0] || null;
    // Consolidate any legacy duplicate holdings for this investment into one
    // (sum units, recompute weighted-average cost in native + BWP), so a single
    // position is maintained per user per investment.
    if (matches.length > 1) {
      const totalUnits = matches.reduce((s, h) => s + (Number(h.units) || 0), 0);
      const totalCostNative = matches.reduce((s, h) => s + (Number(h.units) || 0) * (Number(h.avg_cost) || 0), 0);
      const mergedAvg = totalUnits > 0 ? totalCostNative / totalUnits : 0;
      const totalCostBwp = matches.reduce((s, h) => {
        const ub = Number(h.avg_cost_bwp);
        const unit = Number.isFinite(ub) && ub > 0 ? ub : nativeToBwp(Number(h.avg_cost) || 0, h.currency || currency, fx_rate);
        return s + (Number(h.units) || 0) * unit;
      }, 0);
      const mergedAvgBwp = totalUnits > 0 ? totalCostBwp / totalUnits : 0;
      await base44.entities.Holding.update(matches[0].id, {
        units: totalUnits, avg_cost: mergedAvg, avg_cost_bwp: mergedAvgBwp,
        current_price: price, currency, investment_id: inv.id,
      });
      for (let i = 1; i < matches.length; i++) {
        await base44.entities.Holding.delete(matches[i].id);
      }
      holding = { ...matches[0], units: totalUnits, avg_cost: mergedAvg, avg_cost_bwp: mergedAvgBwp, current_price: price, currency, investment_id: inv.id };
    }
    if (action === 'buy') {
      if (Number(cash.balance) < bwp_total) {
        return Response.json({ error: 'Insufficient cash for this purchase.' }, { status: 400 });
      }
      const newBalance = Number(cash.balance) - bwp_total;
      await base44.entities.CashAccount.update(cash.id, { balance: newBalance, available: newBalance });
      const bwp_unit_cost = nativeToBwp(price, currency, fx_rate);
      if (holding) {
        const u0 = Number(holding.units) || 0;
        const prevAvgBwp = Number(holding.avg_cost_bwp);
        const c0 = Number.isFinite(prevAvgBwp) && prevAvgBwp > 0
          ? prevAvgBwp
          : nativeToBwp(Number(holding.avg_cost) || 0, holding.currency || currency, fx_rate);
        const newUnits = u0 + units;
        const newAvgNative = (u0 * (Number(holding.avg_cost) || 0) + units * price) / newUnits;
        const newAvgBwp = (u0 * c0 + units * bwp_unit_cost) / newUnits;
        await base44.entities.Holding.update(holding.id, {
          units: newUnits,
          avg_cost: newAvgNative,
          avg_cost_bwp: newAvgBwp,
          current_price: price,
          currency,
          investment_id: inv.id,
        });
      } else {
        await base44.entities.Holding.create({
          ticker: inv.ticker,
          name: inv.name,
          units,
          avg_cost: price,
          avg_cost_bwp: bwp_unit_cost,
          current_price: price,
          currency,
          sector: inv.sector,
          investment_id: inv.id,
          account_type,
          created_by_id: user.id,
        });
      }
      await base44.entities.Transaction.create({
        type: 'buy',
        ticker: inv.ticker,
        name: inv.name,
        units,
        price,
        currency,
        fx_rate,
        fees: 0,
        amount: -bwp_total,
        status: 'completed',
        description: `Bought ${units} ${inv.ticker} @ ${price} ${currency} (≈P${bwp_total.toFixed(2)})`,
        client_ref: client_ref || undefined,
        account_type,
        created_by_id: user.id,
      });
      await base44.entities.Notification.create({
        title: 'Purchase completed',
        body: `You bought ${units} ${inv.ticker} for ${currency} ${native_total.toFixed(2)} (≈P${bwp_total.toFixed(2)}).`,
        type: 'trade',
        created_by_id: user.id,
      });
      await recordSnapshot(base44, user.id, account_type);
      return Response.json({
        ok: true,
        action: 'buy',
        units,
        price,
        currency,
        fx_rate,
        native_total,
        total: bwp_total,
        cash_balance: newBalance,
      });
    }
    // SELL
    if (!holding || Number(holding.units) < units) {
      return Response.json({ error: 'You do not own enough units to sell.' }, { status: 400 });
    }
    const newBalance = Number(cash.balance) + bwp_total;
    await base44.entities.CashAccount.update(cash.id, { balance: newBalance, available: newBalance });
    const remaining = Number(holding.units) - units;
    if (remaining > 0) {
      await base44.entities.Holding.update(holding.id, { units: remaining, current_price: price });
    } else {
      await base44.entities.Holding.delete(holding.id);
    }
    await base44.entities.Transaction.create({
      type: 'sell',
      ticker: inv.ticker,
      name: inv.name,
      units,
      price,
      currency,
      fx_rate,
      fees: 0,
      amount: bwp_total,
      status: 'completed',
      description: `Sold ${units} ${inv.ticker} @ ${price} ${currency} (≈P${bwp_total.toFixed(2)})`,
      client_ref: client_ref || undefined,
      created_by_id: user.id,
    });
    await base44.entities.Notification.create({
      title: 'Sale completed',
      body: `You sold ${units} ${inv.ticker} for ${currency} ${native_total.toFixed(2)} (≈P${bwp_total.toFixed(2)}).`,
      type: 'trade',
      created_by_id: user.id,
    });
    await recordSnapshot(base44, user.id, account_type);
    return Response.json({
      ok: true,
      action: 'sell',
      units,
      price,
      currency,
      fx_rate,
      native_total,
      total: bwp_total,
      cash_balance: newBalance,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Trade failed' }, { status: 500 });
  }
}
