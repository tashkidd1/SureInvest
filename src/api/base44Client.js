// Replaces the Base44-hosted SDK client. Keeps the exact same shape
// (`base44.entities.X.list/get/create/update/delete`, `base44.functions.invoke`,
// `base44.auth.*`) so the rest of the app didn't need to change — only this
// file's implementation moved from the Base44 platform to Supabase.
import { supabase } from './supabaseClient';

const TABLES = {
  AppSetting: 'app_settings',
  CashAccount: 'cash_accounts',
  Dividend: 'dividends',
  EducationalContent: 'educational_content',
  ExchangeRate: 'exchange_rates',
  Goal: 'goals',
  GoalContribution: 'goal_contributions',
  Holding: 'holdings',
  Investment: 'investments',
  MarketDataRequest: 'market_data_requests',
  Notification: 'notifications',
  PortfolioSnapshot: 'portfolio_snapshots',
  Profile: 'profiles',
  RecurringInvestment: 'recurring_investments',
  Transaction: 'transactions',
  Watchlist: 'watchlists',
};

function sortColumn(sort) {
  if (!sort) return null;
  return { desc: sort.startsWith('-'), col: sort.replace(/^-/, '') };
}

function makeEntity(name) {
  const table = TABLES[name];
  if (!table) throw new Error(`Unknown entity: ${name}`);
  return {
    async list(sort, limit) {
      let q = supabase.from(table).select('*');
      const s = sortColumn(sort);
      if (s) q = q.order(s.col, { ascending: !s.desc });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`${name} not found`);
      return data;
    },
    async filter(criteria = {}, sort, limit) {
      let q = supabase.from(table).select('*').match(criteria);
      const s = sortColumn(sort);
      if (s) q = q.order(s.col, { ascending: !s.desc });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    async create(fields) {
      const { data, error } = await supabase.from(table).insert(fields).select().single();
      if (error) throw error;
      return data;
    },
    async update(id, fields) {
      const { data, error } = await supabase.from(table).update(fields).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },
  };
}

const entities = new Proxy(
  {},
  {
    get(cache, prop) {
      if (!cache[prop]) cache[prop] = makeEntity(prop);
      return cache[prop];
    },
  }
);

async function me() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();
  return { id: data.user.id, email: data.user.email, role: roleRow?.role || 'user' };
}

export const base44 = {
  entities,
  functions: {
    async invoke(name, body) {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      return data;
    },
  },
  auth: {
    me,
    async isAuthenticated() {
      const { data } = await supabase.auth.getSession();
      return !!data?.session;
    },
    async loginViaEmailPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async register({ email, password }) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    async verifyOtp({ email, otpCode }) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
      if (error) throw error;
      return { access_token: data?.session?.access_token };
    },
    async resendOtp(email) {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
    },
    setToken() {
      // No-op: supabase-js already establishes the session from verifyOtp /
      // signIn calls above, unlike Base44 which needed the token set manually.
    },
    loginWithProvider(provider, returnTo) {
      supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${returnTo || '/'}` },
      });
    },
    async resetPasswordRequest(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    async resetPassword({ newPassword }) {
      // Supabase's recovery link already signs the browser into a temporary
      // recovery session (via the URL it opens); resetToken isn't needed here.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    logout(redirectUrl) {
      supabase.auth.signOut().finally(() => {
        if (redirectUrl) window.location.href = '/login';
      });
    },
    redirectToLogin(returnTo) {
      const path = returnTo && returnTo !== window.location.origin + '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
      window.location.href = `/login${path}`;
    },
  },
};
