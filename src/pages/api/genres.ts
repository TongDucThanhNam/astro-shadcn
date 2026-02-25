import type { APIRoute } from 'astro';

import { CACHE_CONFIGS, getCacheHeaders } from '@/lib/cache';
import { PhimApiClientError, getCategoryTaxonomy } from '@/lib/phimapi';

export const GET: APIRoute = async () => {
  try {
    const data = await getCategoryTaxonomy();

    return new Response(
      JSON.stringify({
        items: data,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCacheHeaders(CACHE_CONFIGS.SECTION_DATA),
        },
      },
    );
  } catch (error: unknown) {
    if (error instanceof PhimApiClientError) {
      return new Response(JSON.stringify({ error: error.message, items: [] }), {
        status: error.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Failed to fetch genres', items: [] }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
