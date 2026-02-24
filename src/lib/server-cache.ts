// Simple in-memory cache scoped to the current server instance (Vercel lambda, Node process, etc.)
// Keeps hot data around between requests to avoid re-fetching the same movie payloads repeatedly.

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

declare global {
  // eslint-disable-next-line no-var
  var __astroServerCache: Map<string, CacheEntry<unknown>> | undefined;
}

const cacheStore: Map<string, CacheEntry<unknown>> = globalThis.__astroServerCache ??
(globalThis.__astroServerCache = new Map());

export function getCachedValue<T>(key: string): T | undefined {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return undefined;
  }

  return entry.value;
}

export function setCachedValue<T>(key: string, value: T, ttlSeconds: number) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { value, expiresAt });
}
