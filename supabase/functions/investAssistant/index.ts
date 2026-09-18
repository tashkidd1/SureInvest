import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';

// Educational AI assistant for SureInvest. Educational only — not financial advice.
// When available, includes a short summary of the caller's simulated (Demo) portfolio
// so answers can reference holdings/cash/goals without inventing positions.

function formatPortfolioContext(holdings: any[], cash: number, goals: any[]): string {
  const lines: string[] = [];
  lines.push(`Available cash (Demo, BWP): P${Number(cash || 0).toFixed(2)}`);

  if (!holdings.length) {
    lines.push('Holdings: none yet.');
  } else {
    lines.push('Holdings (simulated):');
    for (const h of holdings.slice(0, 12)) {
      const units = Number(h.units) || 0;
      const price = Number(h.current_price) || Number(h.avg_cost) || 0;
      const cur = h.currency || 'BWP';
      const ticker = h.ticker || '?';
      const name = h.name || '';
      lines.push(`- ${ticker}${name ? ` (${name})` : ''}: ${units.toFixed(4)} units @ ${price} ${cur}`);
    }
    if (holdings.length > 12) lines.push(`- …and ${holdings.length - 12} more`);
  }

  const activeGoals = goals.filter((g) => (g.status || 'active') === 'active').slice(0, 5);
  if (!activeGoals.length) {
    lines.push('Goals: none active.');
  } else {
    lines.push('Active goals:');
    for (const g of activeGoals) {
      const cur = Number(g.current_amount) || 0;
      const tgt = Number(g.target_amount) || 0;
      const pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100).toFixed(0) : '0';
      lines.push(`- "${g.name}": P${cur.toFixed(0)} / P${tgt.toFixed(0)} (${pct}%)`);
    }
  }

  return lines.join('\n');
}

async function handler(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const question = (body?.question || '').toString().slice(0, 500);
    if (!question.trim()) {
      return Response.json({ error: 'A question is required.' }, { status: 400 });
    }

    // Portfolio context: user-scoped reads (SELECT policies). Demo account only
    // for now — Real trading is disabled and should not feed the assistant.
    let portfolioBlock = 'Portfolio context unavailable.';
    try {
      const [allHoldings, allCash, allGoals] = await Promise.all([
        base44.entities.Holding.list('-created_date', 50),
        base44.entities.CashAccount.list('-created_date', 10),
        base44.entities.Goal.list('-created_date', 20),
      ]);
      const holdings = (allHoldings || []).filter((h: any) => (h.account_type || 'demo') === 'demo');
      const cashRow = (allCash || []).find((c: any) => (c.account_type || 'demo') === 'demo');
      const goals = (allGoals || []).filter((g: any) => (g.account_type || 'demo') === 'demo');
      portfolioBlock = formatPortfolioContext(holdings, Number(cashRow?.balance) || 0, goals);
    } catch (_) {
      // Non-fatal: assistant still answers without portfolio context.
    }

    const systemPrompt =
      'You are the Invest Assistant for SureInvest, a Botswana-focused demo investment education platform. ' +
      'You are EDUCATIONAL ONLY. You are not a licensed financial adviser. ' +
      'Never give guaranteed return claims or personalised investment recommendations (do not say buy/sell/hold a specific security). ' +
      'Explain concepts clearly and simply for a beginner in Botswana, using Pula (BWP) where relevant. ' +
      'Keep answers concise (under 180 words). ' +
      'You may reference the user\'s simulated Demo portfolio summary below when it helps explain a concept ' +
      '(e.g. diversification of their holdings, progress toward a goal). Never invent holdings, cash, or goals. ' +
      'If asked whether to buy or sell a specific security, refuse advice and explain the underlying concept instead. ' +
      'If asked about historical prices, say you do not have historical market data and cannot provide it; never invent prices.\n\n' +
      `User\'s simulated Demo portfolio:\n${portfolioBlock}`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nUser question: ${question}`,
    });
    const answer =
      typeof res === 'string'
        ? res
        : (res && (res.response || res.text || res.content)) || JSON.stringify(res);

    return Response.json({ answer });
  } catch (error) {
    return Response.json({ error: (error as Error).message || 'Assistant unavailable' }, { status: 500 });
  }
}

serveFunction(handler);
