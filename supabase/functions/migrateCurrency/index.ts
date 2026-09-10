import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
import { getUsdBwpRate, nativeToBwp } from '../_shared/currency.ts';
// One-time admin migration for the multi-currency fix. Corrects pre-fix records
// so USD (and other non-BWP) trades are valued in BWP:
//   1. Legacy non-BWP buy/sell transactions: their `amount` was the native total
//      treated as BWP. Restate `amount` to the correct BWP value, store fx_rate
//      and tag legacy=true so they are clearly distinguishable.
//   2. Holdings missing avg_cost_bwp: back-fill the BWP cost basis.
// Cash balances are intentionally NOT retro-adjusted (see report) — going
// forward every new USD trade charges the correct BWP amount server-side.
// Idempotent: already-corrected records are skipped.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const rate = await getUsdBwpRate(base44);
    const [txs, holdings] = await Promise.all([
      base44.asServiceRole.entities.Transaction.list('-created_date', 500),
      base44.asServiceRole.entities.Holding.list('-created_date', 500),
    ]);
    let txCorrected = 0;
    let txBwpTagged = 0;
    for (const t of txs) {
      const isTrade = t.type === 'buy' || t.type === 'sell';
      if (!isTrade) continue;
      const cur = t.currency || 'BWP';
      const hasFx = t.fx_rate !== undefined && t.fx_rate !== null;
      if (cur !== 'BWP' && !hasFx && !t.legacy) {
        const sign = Number(t.amount) >= 0 ? 1 : -1;
        const nativeTotal = Math.abs(Number(t.amount) || 0);
        const bwpTotal = nativeToBwp(nativeTotal, cur, rate);
        await base44.asServiceRole.entities.Transaction.update(t.id, {
          amount: sign * bwpTotal,
          fx_rate: rate,
          legacy: true,
        });
        txCorrected++;
      } else if (cur === 'BWP' && !hasFx) {
        await base44.asServiceRole.entities.Transaction.update(t.id, { fx_rate: 1 });
        txBwpTagged++;
      }
    }
    let holdCorrected = 0;
    for (const h of holdings) {
      const cur = h.currency || 'BWP';
      const hasBwp = h.avg_cost_bwp !== undefined && h.avg_cost_bwp !== null;
      if (hasBwp) continue;
      const bwpCost = cur === 'BWP' ? (Number(h.avg_cost) || 0) : nativeToBwp(Number(h.avg_cost) || 0, cur, rate);
      await base44.asServiceRole.entities.Holding.update(h.id, { avg_cost_bwp: bwpCost });
      holdCorrected++;
    }
    return Response.json({
      ok: true,
      rate_used: rate,
      legacy_transactions_corrected: txCorrected,
      bwp_transactions_tagged: txBwpTagged,
      holdings_cost_basis_backfilled: holdCorrected,
      cash_adjusted: false,
      message:
        `Migration complete using USD/BWP=${rate}. ` +
        `${txCorrected} legacy non-BWP transaction(s) restated to BWP and tagged legacy=true; ` +
        `${txBwpTagged} BWP transaction(s) tagged fx_rate=1; ` +
        `${holdCorrected} holding(s) given a BWP cost basis. ` +
        `Cash balances were not retro-adjusted (test environment has multiple cash accounts from repeated onboarding runs, so a ledger-wide recompute would be unsafe); all new USD trades now charge the correct BWP amount server-side.`,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Migration failed' }, { status: 500 });
  }
}

serveFunction(handler);
