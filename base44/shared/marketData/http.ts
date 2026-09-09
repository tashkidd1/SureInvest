// Shared fetch helper for market-data providers: fails fast instead of
// hanging the whole refresh when a provider is slow or unresponsive.
export function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal })
    .catch((e) => {
      throw new Error(e && e.name === 'AbortError' ? 'request timed out' : (e.message || 'request failed'));
    })
    .finally(() => clearTimeout(timer));
}
