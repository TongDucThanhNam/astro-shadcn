import type { APIRoute } from "astro";

import { CACHE_CONFIGS, getCacheHeaders } from "@/lib/cache";
import {
  PhimApiClientError,
  getMovieByTmdb,
  normalizeTmdbId,
  normalizeTmdbType,
} from "@/lib/phimapi";

export const GET: APIRoute = async ({ params }) => {
  const { type, id } = params;

  if (!type || !id) {
    return new Response(JSON.stringify({ error: "Missing TMDB type or id." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const normalizedType = normalizeTmdbType(type);
    const normalizedId = normalizeTmdbId(id);
    const payload = await getMovieByTmdb(normalizedType, normalizedId);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCacheHeaders(CACHE_CONFIGS.MOVIE_DETAIL),
      },
    });
  } catch (error: unknown) {
    if (error instanceof PhimApiClientError) {
      return new Response(JSON.stringify({ error: error.message, code: error.code }), {
        status: error.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unexpected TMDB proxy error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
