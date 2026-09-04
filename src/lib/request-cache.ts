/**
 * Standard for avoiding 429s from rapid, repeated reads: a short-TTL,
 * in-memory cache keyed by request identity. Rapidly re-mounting a module
 * (fast nav clicks) or re-opening a dialog reuses the same in-flight or
 * recently-resolved request instead of hitting the API again. Call
 * `clear()` after any mutation so the next read is never stale.
 */
export function createRequestCache<T>(ttlMs: number) {
  const cache = new Map<string, { promise: Promise<T>; expiresAt: number }>();

  function get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.promise;

    const promise = fetcher();
    cache.set(key, { promise, expiresAt: Date.now() + ttlMs });
    promise.catch(() => cache.delete(key));
    return promise;
  }

  function clear() {
    cache.clear();
  }

  return { get, clear };
}
