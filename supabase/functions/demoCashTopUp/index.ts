import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';

const TOP_UP_AMOUNT = 5000;

// Financial writes go through asServiceRole after auth + ownership checks.
// Clients must not be able to invent balances via PostgREST; RLS write policies
// on cash/transactions are removed in a companion migration.
async function handler(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accounts = await base44.entities.CashAccount.filter({
      created_by_id: user.id,
      account_type: 'demo',
    }, '-created_date', 1);
    const account = accounts[0];
    if (!account) return Response.json({ error: 'Demo cash account not found.' }, { status: 404 });
    if (account.created_by_id && account.created_by_id !== user.id) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const current = Number(account.balance) || 0;
    const newBalance = current + TOP_UP_AMOUNT;
    const updated = await base44.asServiceRole.entities.CashAccount.update(account.id, {
      balance: newBalance,
      available: newBalance,
    });

    try {
      await base44.asServiceRole.entities.Transaction.create({
        type: 'deposit',
        amount: TOP_UP_AMOUNT,
        currency: 'BWP',
        description: 'Demo top-up',
        account_type: 'demo',
        created_by_id: user.id,
      });
    } catch (txError) {
      try {
        await base44.asServiceRole.entities.CashAccount.update(account.id, {
          balance: current,
          available: current,
        });
      } catch (_) {}
      throw txError;
    }

    try {
      await base44.asServiceRole.entities.Notification.create({
        title: 'Cash topped up',
        body: 'P5,000 demo cash added to your account.',
        type: 'success',
        icon: 'Wallet',
        created_by_id: user.id,
      });
    } catch (_) {}

    return Response.json({ ok: true, amount: TOP_UP_AMOUNT, balance: Number(updated?.balance) || newBalance });
  } catch (e) {
    return Response.json({ error: e?.message || 'Could not add demo cash.' }, { status: 400 });
  }
}

serveFunction(handler);
