// Compatibility shim: reproduces the slice of the Base44 server SDK that
// InvestBW's functions rely on (entities.X.list/get/create/update/delete/
// filter/deleteMany, auth.me, asServiceRole, asServiceRole.integrations.Core.InvokeLLM),
// backed by Supabase. This lets the original function bodies run with only
// their import line changed.
import { createClient } from 'npm:@supabase/supabase-js@2';

// entity name -> real Postgres table name
const TABLES: Record<string, string> = {
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

const SORT_COL: Record<string, string> = {
  '-created_date': 'created_date',
  'created_date': 'created_date',
  '-last_updated': 'last_updated',
  'last_updated': 'last_updated',
};

function applySort(query: any, sort?: string) {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  const col = SORT_COL[sort] || sort.replace(/^-/, '');
  return query.order(col, { ascending: !desc });
}

function makeEntity(supabase: any, name: string) {
  const table = TABLES[name];
  if (!table) throw new Error(`Unknown entity: ${name}`);
  return {
    async list(sort?: string, limit?: number) {
      let q = supabase.from(table).select('*');
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },
    async get(id: string) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data || null;
    },
    async filter(criteria: Record<string, any> = {}, sort?: string, limit?: number) {
      let q = supabase.from(table).select('*');
      for (const [k, v] of Object.entries(criteria)) {
        if (v && typeof v === 'object' && '$lt' in v) {
          q = q.lt(k, (v as any).$lt);
        } else {
          q = q.eq(k, v);
        }
      }
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },
    async create(fields: Record<string, any>) {
      const { data, error } = await supabase.from(table).insert(fields).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async update(id: string, fields: Record<string, any>) {
      const { data, error } = await supabase.from(table).update(fields).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { ok: true };
    },
    async deleteMany(criteria: Record<string, any> = {}) {
      let q = supabase.from(table).delete();
      for (const [k, v] of Object.entries(criteria)) {
        if (v && typeof v === 'object' && '$lt' in v) {
          q = q.lt(k, (v as any).$lt);
        } else {
          q = q.eq(k, v);
        }
      }
      const { error } = await q;
      if (error) throw new Error(error.message);
      return { ok: true };
    },
  };
}

function makeEntities(supabase: any) {
  const cache: Record<string, any> = {};
  return new Proxy(cache, {
    get(_target, prop: string) {
      if (!cache[prop]) cache[prop] = makeEntity(supabase, prop);
      return cache[prop];
    },
  });
}

async function invokeLLM({ prompt }: { prompt: string }) {
  const provider = (Deno.env.get('LLM_PROVIDER') || 'openai').toLowerCase();
  const apiKey = Deno.env.get('LLM_API_KEY');
  if (!apiKey) throw new Error('LLM_API_KEY is not configured.');
  if (provider === 'anthropic') {
    const model = Deno.env.get('LLM_MODEL') || 'claude-3-5-haiku-latest';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    return data?.content?.[0]?.text || '';
  }
  // default: OpenAI-compatible
  const model = Deno.env.get('LLM_MODEL') || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// Mirrors Base44's `createClientFromRequest(req)`: builds a user-scoped
// client (RLS applies, using the caller's JWT) plus an `asServiceRole`
// client (RLS bypassed, using the service role key) from the same request.
export function createClientFromRequest(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') || '';

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceKey);

  let cachedUser: any = null;
  let userChecked = false;

  return {
    entities: makeEntities(userClient),
    auth: {
      async me() {
        if (userChecked) return cachedUser;
        userChecked = true;
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (!token) return null;
        const { data, error } = await userClient.auth.getUser(token);
        if (error || !data?.user) return null;
        const { data: roleRow } = await serviceClient
          .from('user_roles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();
        cachedUser = { id: data.user.id, email: data.user.email, role: roleRow?.role || 'user' };
        return cachedUser;
      },
    },
    asServiceRole: {
      entities: makeEntities(serviceClient),
      integrations: {
        Core: { InvokeLLM: invokeLLM },
      },
    },
  };
}

// Shim for Base44's `import { secrets } from 'base44:runtime'`.
export const secrets = {
  get(name: string) {
    return Deno.env.get(name) ?? null;
  },
};
