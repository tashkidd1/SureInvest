import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
// Educational AI assistant for InvestBW. Educational only — not financial advice.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const question = (body?.question || '').toString().slice(0, 500);
    if (!question.trim()) {
      return Response.json({ error: 'A question is required.' }, { status: 400 });
    }
    const systemPrompt =
      'You are the Invest Assistant for InvestBW, a Botswana-focused demo investment education platform. ' +
      'You are EDUCATIONAL ONLY. You are not a licensed financial adviser. ' +
      'Never give guaranteed return claims or personalised investment recommendations. ' +
      'Explain concepts clearly and simply for a beginner in Botswana, using Pula (BWP) where relevant. ' +
      'Keep answers concise (under 150 words). ' +
      'If asked whether to buy or sell a specific security, remind the user you cannot give advice and explain the concept instead. ' +
      'If asked about historical prices (for example "what was the price six months ago" or performance over the last year), tell the user you do not currently have access to historical market data and cannot provide it; never estimate or invent historical prices.';
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nUser question: ${question}`,
    });
    const answer = typeof res === 'string' ? res : (res && (res.response || res.text || res.content)) || JSON.stringify(res);
    return Response.json({ answer });
  } catch (error) {
    return Response.json({ error: error.message || 'Assistant unavailable' }, { status: 500 });
  }
}

serveFunction(handler);
