// Cache utilities for API responses
export interface CacheConfig {
  maxAge: number; // seconds
  staleWhileRevalidate: number; // seconds
}

export const CACHE_CONFIGS = {
  QUERY_PAGES: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 1800, // 30 minutes
  },
  SECTION_DATA: {
    maxAge: 14400, // 4 hours
    staleWhileRevalidate: 86400, // 24 hours
  },
  MOVIE_DETAIL: {
    maxAge: 28800, // 8 hours
    staleWhileRevalidate: 172800, // 48 hours
  },
  SEARCH_RESULTS: {
    maxAge: 7200, // 2 hours
    staleWhileRevalidate: 14400, // 4 hours
  },
} as const;

export function getCacheHeaders(config: CacheConfig) {
  return {
    'Cache-Control': `public, max-age=${config.maxAge}, s-maxage=${config.maxAge * 3}, stale-while-revalidate=${config.staleWhileRevalidate}`,
  };
}

// Astro-specific cache utilities for SSR
export function getAstroCacheHeaders() {
  return {
    'CDN-Cache-Control': 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
  };
}
