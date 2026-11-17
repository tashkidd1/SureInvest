// Unit tests for budget helpers (pure logic + mock entity layer).
// Run: deno test --allow-env supabase/functions/_shared/marketData/requestBudget.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { DAILY_MANSA_CEILING, checkMansaBudget, assertMansaRequestAllowed } from './requestBudget.ts';

function mockBase44(mansaRows: { created_date: string; category?: string; status?: string }[]) {
  return {
    asServiceRole: {
      entities: {
        MarketDataRequest: {
          async filter(criteria: Record<string, unknown>) {
            return mansaRows.filter((r) => {
              if (criteria.provider && (r as any).provider && (r as any).provider !== criteria.provider) return false;
              if (criteria.category && r.category !== criteria.category) return false;
              if (criteria.status && r.status !== criteria.status) return false;
              return true;
            }).map((r) => ({ provider: 'mansa', status: 'success', ...r }));
          },
          async create() { return {}; },
          async deleteMany() { return { ok: true }; },
        },
      },
    },
  };
}

Deno.test('checkMansaBudget allows under ceiling', async () => {
  const base44 = mockBase44([
    { created_date: new Date().toISOString(), provider: 'mansa' } as any,
  ]);
  // tag provider on rows
  const rows = Array.from({ length: 5 }, () => ({
    created_date: new Date().toISOString(),
    provider: 'mansa',
  }));
  const b = mockBase44(rows as any);
  // fix filter to respect provider
  b.asServiceRole.entities.MarketDataRequest.filter = async (criteria: any) => {
    return rows.filter(() => criteria.provider === 'mansa').map((r) => ({ ...r, status: 'success' }));
  };
  const budget = await checkMansaBudget(b);
  assertEquals(budget.allowed, true);
  assertEquals(budget.used, 5);
  assertEquals(budget.ceiling, DAILY_MANSA_CEILING);
});

Deno.test('checkMansaBudget blocks at ceiling', async () => {
  const rows = Array.from({ length: DAILY_MANSA_CEILING }, () => ({
    created_date: new Date().toISOString(),
  }));
  const b = mockBase44(rows);
  b.asServiceRole.entities.MarketDataRequest.filter = async () =>
    rows.map((r) => ({ ...r, provider: 'mansa', status: 'success' }));
  const budget = await checkMansaBudget(b);
  assertEquals(budget.allowed, false);
  assertEquals(budget.used, DAILY_MANSA_CEILING);
});

Deno.test('assertMansaRequestAllowed respects freshness', async () => {
  const recent = {
    created_date: new Date().toISOString(),
    category: 'bse_snapshot',
    status: 'success',
    provider: 'mansa',
  };
  const b = mockBase44([recent]);
  b.asServiceRole.entities.MarketDataRequest.filter = async (criteria: any) => {
    if (criteria.category === 'bse_snapshot') return [recent];
    return [];
  };
  const gate = await assertMansaRequestAllowed(b, 'bse_snapshot', 15 * 60 * 1000);
  assertEquals(gate.allowed, false);
  assertEquals(gate.reason, 'fresh');
});
