// Shared auth for cron-invoked Edge Functions.
// Accepts either:
//   1. Authorization: Bearer <CRON_SECRET> (or SCHEDULER_SECRET) from the scheduler, or
//   2. An authenticated admin user (for manual ops / force runs).
// Anonymous callers are always rejected.

export type AuthResult =
  | { ok: true; mode: 'scheduler' | 'admin'; user: { id: string; email?: string; role: string } | null }
  | { ok: false; response: Response };

function getCronSecret(): string | null {
  return Deno.env.get('CRON_SECRET') || Deno.env.get('SCHEDULER_SECRET') || null;
}

function bearerToken(req: Request): string {
  const h = req.headers.get('Authorization') || '';
  return h.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Gate scheduled / privileged functions.
 * @param req Incoming request
 * @param user Result of base44.auth.me() (may be null)
 * @param options.allowAdmin When true (default), admins may invoke without the cron secret
 */
export function requireSchedulerOrAdmin(
  req: Request,
  user: { id: string; email?: string; role: string } | null,
  options: { allowAdmin?: boolean } = {},
): AuthResult {
  const allowAdmin = options.allowAdmin !== false;
  const secret = getCronSecret();
  const token = bearerToken(req);

  // Preferred path: scheduler presents the shared secret.
  if (secret && token && token === secret) {
    return { ok: true, mode: 'scheduler', user: null };
  }

  // Admin path (manual trigger / force test).
  if (allowAdmin && user && user.role === 'admin') {
    return { ok: true, mode: 'admin', user };
  }

  // Misconfiguration: no secret configured and no admin — fail closed.
  if (!secret) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Scheduler secret is not configured (CRON_SECRET).' },
        { status: 503 },
      ),
    };
  }

  return {
    ok: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}
