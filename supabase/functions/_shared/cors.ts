// Minimal permissive CORS so the Vite dev server (or any client) can call
// these functions directly. Tighten the origin for a real deployment.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export function corsPreflight(): Response {
  return new Response('ok', { headers: corsHeaders });
}

// Wraps a Base44-style `async function(req) => Response` handler into a
// Deno.serve-compatible entry point with CORS handled.
export function serveFunction(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return corsPreflight();
    const res = await handler(req);
    return withCors(res);
  });
}
