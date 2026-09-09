import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
// Idempotent onboarding for new users. All records are created with the
// user-scoped client (NOT asServiceRole) so created_by_id is stamped to the
// calling user — that ownership is what lets RLS show them their own data.
// Re-submitting onboarding is safe: existing profile/account are reused and
// only the profile fields are updated.
export default async function(req) {
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
    // User-scoped lookup: only sees records owned by this user (RLS).
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
    // Provision the demo cash account exactly once with P10,000.
    let cashAccount = existingAccounts[0];
    if (!cashAccount) {
      cashAccount = await base44.entities.CashAccount.create({
        balance: 10000, currency: 'BWP', available: 10000, label: 'Demo Cash Account',
        account_type: 'demo',
      });
      await base44.entities.Transaction.create({
        type: 'deposit', amount: 10000, currency: 'BWP', fx_rate: 1, fees: 0,
        description: 'Demo starting balance (virtual funds)', status: 'completed',
        account_type: 'demo',
        client_ref: `onboard-deposit-${user.id}`,
      });
    }
    // Welcome notification — also user-scoped so the user can see it.
    await base44.entities.Notification.create({
      title: 'Welcome to InvestBW',
      body: 'Your demo account is ready with P10,000 in virtual funds. Start exploring the markets!',
      type: 'success', read: false, icon: 'Sparkles',
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
