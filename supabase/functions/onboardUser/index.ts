import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
// Idempotent onboarding for new users. Profile writes stay user-scoped; cash
// and ledger rows use service role with explicit created_by_id so RLS write
// lockdown on financial tables does not break provisioning.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    const experience_level = ['beginner', 'some', 'experienced'].includes(body.experience_level) ? body.experience_level : 'beginner';
    const primary_goal = ['wealth', 'retirement', 'education', 'home', 'emergency', 'general', 'other'].includes(body.primary_goal) ? body.primary_goal : 'general';
    const risk_tolerance = ['conservative', 'moderate', 'aggressive'].includes(body.risk_tolerance) ? body.risk_tolerance : 'moderate';
    const clean = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
    const first_name = clean(body.first_name, 60);
    const last_name = clean(body.last_name, 60);
    const display_name = clean(body.display_name, 80) || [first_name, last_name].filter(Boolean).join(' ') || '';
    const [existingProfiles, existingAccounts] = await Promise.all([
      base44.entities.Profile.list('-created_date', 5),
      base44.entities.CashAccount.list('-created_date', 5),
    ]);
    let profile = existingProfiles[0];
    if (profile) {
      profile = await base44.entities.Profile.update(profile.id, {
        experience_level, primary_goal, risk_tolerance,
        first_name: first_name || profile.first_name,
        last_name: last_name || profile.last_name,
        display_name: display_name || profile.display_name,
        onboarding_completed: true,
      });
    } else {
      profile = await base44.entities.Profile.create({
        experience_level, primary_goal, risk_tolerance,
        first_name, last_name, display_name,
        onboarding_completed: true,
        demo_mode: true, base_currency: 'BWP', country: 'Botswana',
      });
    }
    let cashAccount = existingAccounts[0];
    if (!cashAccount) {
      cashAccount = await base44.asServiceRole.entities.CashAccount.create({
        balance: 10000, currency: 'BWP', available: 10000, label: 'Demo Cash Account',
        account_type: 'demo',
        created_by_id: user.id,
      });
      await base44.asServiceRole.entities.Transaction.create({
        type: 'deposit', amount: 10000, currency: 'BWP', fx_rate: 1, fees: 0,
        description: 'Demo starting balance (virtual funds)', status: 'completed',
        account_type: 'demo',
        client_ref: `onboard-deposit-${user.id}`,
        created_by_id: user.id,
      });
    }
    await base44.asServiceRole.entities.Notification.create({
      title: 'Welcome to SureInvest',
      body: 'Your demo account is ready with P10,000 in virtual funds. Start exploring the markets!',
      type: 'success', read: false, icon: 'Sparkles',
      created_by_id: user.id,
    }).catch(() => {});
    return Response.json({
      ok: true,
      profile,
      cash_account: cashAccount,
      balance: cashAccount.balance,
      message: 'Onboarding complete.',
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Onboarding failed.' }, { status: 500 });
  }
}

serveFunction(handler);
