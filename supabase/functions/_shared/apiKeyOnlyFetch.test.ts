import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createApiKeyOnlyFetch } from './apiKeyOnlyFetch.ts';

Deno.test('secret API key fetch keeps apikey and strips Authorization', async () => {
  let captured: Headers | null = null;
  const fetcher = createApiKeyOnlyFetch(async (_input, init) => {
    captured = new Headers(init?.headers);
    return new Response(null, { status: 204 });
  });

  await fetcher('https://example.supabase.co/rest/v1/test', {
    method: 'GET',
    headers: {
      apikey: 'sb_secret_test-value',
      Authorization: 'Bearer sb_secret_test-value',
      'Content-Type': 'application/json',
    },
  });

  assertEquals(captured?.get('apikey'), 'sb_secret_test-value');
  assertEquals(captured?.has('Authorization'), false);
  assertEquals(captured?.get('Content-Type'), 'application/json');
});

Deno.test('API-key-only fetch does not mutate caller headers', async () => {
  const original = new Headers({
    apikey: 'sb_secret_test-value',
    Authorization: 'Bearer sb_secret_test-value',
  });
  const fetcher = createApiKeyOnlyFetch(async (_input, init) => {
    assertEquals(new Headers(init?.headers).has('Authorization'), false);
    return new Response(null, { status: 204 });
  });

  await fetcher('https://example.supabase.co/rest/v1/test', { headers: original });

  assertEquals(original.get('Authorization'), 'Bearer sb_secret_test-value');
});
