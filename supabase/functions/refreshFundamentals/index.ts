import { serveFunction } from '../_shared/cors.ts';
import { createClientFromRequest } from '../_shared/base44Compat.ts';
import { secrets } from '../_shared/base44Compat.ts';

const MAX_PER_RUN = 10;

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '' || value === 'None' || value === 'N/A') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchStatistics(apiKey: string, ticker: string, exchange?: string) {
  const url = new URL('https://api.twelvedata.com/statistics');
  url.searchParams.set('symbol', ticker);
  url.searchParams.set('apikey', apiKey);
  if (exchange) url.searchParams.set('exchange', exchange);
  const response = await fetch(url.toString());
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === 'error') {
    return { ok: false, status: response.status, error: body.message || `HTTP ${response.status}` };
  }
  return { ok: true, status: response.status, data: body };
}

function extractFundamentals(data: Record<string, any>) {
  // Twelve Data has used both nested and flat statistics shapes over time;
  // accept either so the persisted values remain provider-derived.
  const root = data.statistics || data;
  const valuation = root.valuation || {};
  const dividends = root.dividends || {};
  const marketCap = toNumber(root.market_cap ?? root.market_capitalization ?? valuation.market_cap);
  const pe = toNumber(root.pe_ratio ?? root.price_to_earnings_ratio ?? valuation.pe_ratio);
  const yieldValue = toNumber(
    root.trailing_annual_dividend_yield ??
    root.dividend_yield ??
    dividends.trailing_annual_dividend_yield,
  );
  const frequency = root.dividend_frequency ?? dividends.dividend_frequency ?? null;
  return { marketCap, pe, yieldValue, frequency };
}

async function handler(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKey = secrets.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      return Response.json({
        status: 'no_key',
        message: 'TWELVE_DATA_API_KEY is not configured.',
        updated: 0,
        failed: 0,
      }, { status: 503 });
    }

    const rows = await base44.asServiceRole.entities.Investment.filter({});
    const targets = rows
      .filter((row) => row.category !== 'crypto' && row.ticker)
      .sort((a, b) => (a.fundamentals_updated_at || '').localeCompare(b.fundamentals_updated_at || ''))
      .slice(0, MAX_PER_RUN);

    const updatedSymbols: string[] = [];
    const failed: Array<{ ticker: string; error: string }> = [];

    for (const inv of targets) {
      const exchange = inv.market === 'botswana' ? 'XBOT' : undefined;
      const result = await fetchStatistics(apiKey, inv.ticker, exchange);
      if (!result.ok) {
        failed.push({ ticker: inv.ticker, error: result.error || 'Provider error' });
        continue;
      }

      const values = extractFundamentals(result.data);
      const hasFundamental = values.marketCap !== null || values.pe !== null || values.yieldValue !== null;
      if (!hasFundamental) {
        failed.push({ ticker: inv.ticker, error: 'Provider returned no supported fundamentals' });
        continue;
      }

      const fields: Record<string, unknown> = {
        fundamentals_source: 'twelve_data',
        fundamentals_updated_at: new Date().toISOString(),
      };
      if (values.marketCap !== null) fields.market_cap = values.marketCap;
      if (values.pe !== null) fields.pe_ratio = values.pe;
      if (values.yieldValue !== null) fields.dividend_yield = values.yieldValue;
      if (values.frequency) fields.dividend_frequency = values.frequency;

      await base44.asServiceRole.entities.Investment.update(inv.id, fields);
      updatedSymbols.push(inv.ticker);
    }

    const providerError = failed.find((item) => /plan|credit|premium|subscription|not available/i.test(item.error));
    return Response.json({
      status: updatedSymbols.length ? (failed.length ? 'partial' : 'updated') : 'provider_error',
      attempted: targets.map((row) => row.ticker),
      updated: updatedSymbols.length,
      updatedSymbols,
      failed,
      planHint: providerError
        ? 'Twelve Data /statistics requires a paid plan. No fallback or seeded values were written.'
        : null,
      message: updatedSymbols.length
        ? `Updated live fundamentals for ${updatedSymbols.length} investment(s).`
        : 'No live fundamentals were updated. Existing values were left unchanged.',
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Fundamentals refresh failed' }, { status: 500 });
  }
}

serveFunction(handler);
