// Supabase secret API keys are not JWTs. Keep the SDK-generated apikey
// header, but remove its default Authorization: Bearer <api-key> header.
// This wrapper is used only for clients authenticated with sb_secret_ keys.
export function createApiKeyOnlyFetch(fetchImpl: typeof fetch = fetch): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.delete('Authorization');
    return fetchImpl(input, { ...init, headers });
  };
}
