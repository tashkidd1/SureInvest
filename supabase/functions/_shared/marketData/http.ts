// Shared fetch helper for market-data providers: fails fast instead of
// hanging the whole refresh when a provider is slow or unresponsive.
export function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal })
    .catch((e: unknown) => {
      throw new Error(e instanceof Error && e.name === 'AbortError' ? 'request timed out' : (e instanceof Error ? e.message : 'request failed'));
    })
    .finally(() => clearTimeout(timer));
}
