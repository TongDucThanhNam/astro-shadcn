import type { APIRoute } from "astro";

import { CACHE_CONFIGS, getCacheHeaders } from "@/lib/cache";
import {
  PhimApiClientError,
  getListByType,
  listQueryFromRequest,
} from "@/lib/phimapi";

export const GET: APIRoute = async ({ params, request }) => {
  const { typeList } = params;

  if (!typeList) {
    return new Response(JSON.stringify({ error: "Missing typeList parameter" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  try {
    const url = new URL(request.url);
    const queryInput = listQueryFromRequest(url.searchParams);
    const data = await getListByType(typeList, queryInput);

    return new Response(
      JSON.stringify({
        items: data.data.items,
        totalPages: data.data.params.pagination.totalPages,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCacheHeaders(CACHE_CONFIGS.SECTION_DATA),
        },
      },
    );
  } catch (error: unknown) {
    if (error instanceof PhimApiClientError) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code, items: [] }),
        {
          status: error.status,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Failed to fetch data", items: [] }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
