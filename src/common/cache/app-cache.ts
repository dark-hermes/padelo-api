type CacheEntry = { value: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export function cacheGet<T>(key: string): T | undefined {
  const e = cache.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet(key: string, value: unknown, ttlSeconds = 600) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cache.set(key, { value, expiresAt });
}

export function cacheDel(key: string) {
  cache.delete(key);
}
