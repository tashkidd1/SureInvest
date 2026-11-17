// Deno tests for scheduler auth gate.
// Run: deno test --allow-env supabase/functions/_shared/schedulerAuth.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { requireSchedulerOrAdmin } from './schedulerAuth.ts';

function req(auth?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (auth) headers.set('Authorization', auth);
  return new Request('http://localhost/fn', { method: 'POST', headers, body: '{}' });
}

Deno.test('rejects anonymous when secret configured', () => {
  Deno.env.set('CRON_SECRET', 'test-secret-abc');
  const result = requireSchedulerOrAdmin(req(), null);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.response.status, 401);
});

Deno.test('accepts matching CRON_SECRET bearer', () => {
  Deno.env.set('CRON_SECRET', 'test-secret-abc');
  const result = requireSchedulerOrAdmin(req('Bearer test-secret-abc'), null);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.mode, 'scheduler');
});

Deno.test('accepts admin JWT path', () => {
  Deno.env.set('CRON_SECRET', 'test-secret-abc');
  const admin = { id: 'u1', role: 'admin' };
  const result = requireSchedulerOrAdmin(req('Bearer user-jwt'), admin);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.mode, 'admin');
});

Deno.test('rejects non-admin user without secret', () => {
  Deno.env.set('CRON_SECRET', 'test-secret-abc');
  const user = { id: 'u2', role: 'user' };
  const result = requireSchedulerOrAdmin(req('Bearer user-jwt'), user);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.response.status, 401);
});

Deno.test('503 when secret missing and no admin', () => {
  Deno.env.delete('CRON_SECRET');
  Deno.env.delete('SCHEDULER_SECRET');
  const result = requireSchedulerOrAdmin(req(), null);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.response.status, 503);
});
