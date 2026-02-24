import { getSecret } from 'astro:env/server';
import type { ZodTypeAny } from 'zod';

import { CACHE_CONFIGS, getCacheHeaders, type CacheConfig } from '@/lib/cache';
import {
  latestV1ResponseSchema,
  latestV2ResponseSchema,
  latestV3ResponseSchema,
  listResponseSchema,
  movieDetailResponseSchema,
  searchResponseSchema,
  taxonomyListSchema,
  tmdbMovieResponseSchema,
  type LatestMoviesResponseV1,
  type LatestMoviesResponseV2,
  type LatestMoviesResponseV3,
  type ListResponse,
  type MovieDetailResponse,
  type SearchResponse,
  type TaxonomyItem,
} from './schemas';
import {
  normalizeTmdbId,
  normalizeTmdbType,
  normalizeTypeList,
  normalizeYearParam,
  parseFeedVersion,
  parseListQuery,
  toListSearchParams,
  type LatestFeedVersion,
  type QueryInput,
  type TmdbType,
} from './query';

const LATEST_PATHS = {
  v1: '/danh-sach/phim-moi-cap-nhat',
  v2: '/danh-sach/phim-moi-cap-nhat-v2',
  v3: '/danh-sach/phim-moi-cap-nhat-v3',
} as const;

export type PhimApiErrorCode =
  | 'missing_config'
  | 'invalid_query'
  | 'upstream_http_error'
  | 'invalid_json'
  | 'invalid_payload';

export class PhimApiClientError extends Error {
  code: PhimApiErrorCode;
  status: number;

  constructor(message: string, code: PhimApiErrorCode, status = 500) {
    super(message);
    this.name = 'PhimApiClientError';
    this.code = code;
    this.status = status;
  }
}

function getApiBaseUrl() {
  const apiBase = getSecret('PUBLIC_PHIM_MOI');
  if (!apiBase) {
    throw new PhimApiClientError('Missing PUBLIC_PHIM_MOI configuration.', 'missing_config', 500);
  }

  return apiBase;
}

function buildApiUrl(pathname: string, searchParams?: URLSearchParams) {
  const url = new URL(pathname, getApiBaseUrl());
  if (searchParams) {
    url.search = searchParams.toString();
  }

  return url;
}

async function requestJson<TSchema extends ZodTypeAny>(options: {
  pathname: string;
  schema: TSchema;
  searchParams?: URLSearchParams;
  cacheConfig: CacheConfig;
}): Promise<ReturnType<TSchema['parse']>> {
  const url = buildApiUrl(options.pathname, options.searchParams);
  const response = await fetch(url.toString(), {
    cache: 'force-cache',
    headers: getCacheHeaders(options.cacheConfig),
  });

  if (!response.ok) {
    throw new PhimApiClientError(
      `Upstream API returned ${response.status}.`,
      'upstream_http_error',
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PhimApiClientError('Upstream API did not return valid JSON.', 'invalid_json', 502);
  }

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const issuePath = firstIssue?.path?.join('.') ?? 'unknown';
    throw new PhimApiClientError(
      `Invalid upstream payload at ${issuePath}.`,
      'invalid_payload',
      502,
    );
  }

  return parsed.data;
}

export async function getLatestMovies(
  options: {
    page?: number;
    feedVersion?: LatestFeedVersion;
  } = {},
): Promise<LatestMoviesResponseV1 | LatestMoviesResponseV2 | LatestMoviesResponseV3> {
  const page =
    Number.isFinite(options.page) && (options.page ?? 0) > 0
      ? Math.trunc(options.page as number)
      : 1;
  const feedVersion = parseFeedVersion(options.feedVersion);
  const searchParams = new URLSearchParams({ page: String(page) });

  if (feedVersion === 'v2') {
    return requestJson({
      pathname: LATEST_PATHS.v2,
      schema: latestV2ResponseSchema,
      searchParams,
      cacheConfig: CACHE_CONFIGS.SECTION_DATA,
    });
  }

  if (feedVersion === 'v3') {
    return requestJson({
      pathname: LATEST_PATHS.v3,
      schema: latestV3ResponseSchema,
      searchParams,
      cacheConfig: CACHE_CONFIGS.SECTION_DATA,
    });
  }

  return requestJson({
    pathname: LATEST_PATHS.v1,
    schema: latestV1ResponseSchema,
    searchParams,
    cacheConfig: CACHE_CONFIGS.SECTION_DATA,
  });
}

export async function getMovieDetail(slug: string): Promise<MovieDetailResponse> {
  let normalizedSlug: string;
  try {
    normalizedSlug = normalizeTypeList(slug, 'slug');
  } catch {
    throw new PhimApiClientError('Invalid slug.', 'invalid_query', 400);
  }

  return requestJson({
    pathname: `/phim/${encodeURIComponent(normalizedSlug)}`,
    schema: movieDetailResponseSchema,
    cacheConfig: CACHE_CONFIGS.MOVIE_DETAIL,
  });
}

export async function getMovieByTmdb(type: TmdbType, id: string): Promise<MovieDetailResponse> {
  const tmdbType = normalizeTmdbType(type);
  const tmdbId = normalizeTmdbId(id);

  return requestJson({
    pathname: `/tmdb/${tmdbType}/${tmdbId}`,
    schema: tmdbMovieResponseSchema,
    cacheConfig: CACHE_CONFIGS.MOVIE_DETAIL,
  });
}

export async function getListByType(
  typeList: string,
  queryInput: QueryInput = {},
): Promise<ListResponse> {
  const normalizedTypeList = normalizeTypeList(typeList);
  const query = parseListQuery(queryInput, { limit: 10 });

  return requestJson({
    pathname: `/v1/api/danh-sach/${encodeURIComponent(normalizedTypeList)}`,
    schema: listResponseSchema,
    searchParams: toListSearchParams(query),
    cacheConfig: CACHE_CONFIGS.SECTION_DATA,
  });
}

export async function getByCategory(
  categorySlug: string,
  queryInput: QueryInput = {},
): Promise<ListResponse> {
  const normalizedSlug = normalizeTypeList(categorySlug, 'category slug');
  const query = parseListQuery(queryInput, { limit: 10 });

  return requestJson({
    pathname: `/v1/api/the-loai/${encodeURIComponent(normalizedSlug)}`,
    schema: listResponseSchema,
    searchParams: toListSearchParams(query),
    cacheConfig: CACHE_CONFIGS.SECTION_DATA,
  });
}

export async function getByCountry(
  countrySlug: string,
  queryInput: QueryInput = {},
): Promise<ListResponse> {
  const normalizedSlug = normalizeTypeList(countrySlug, 'country slug');
  const query = parseListQuery(queryInput, { limit: 10 });

  return requestJson({
    pathname: `/v1/api/quoc-gia/${encodeURIComponent(normalizedSlug)}`,
    schema: listResponseSchema,
    searchParams: toListSearchParams(query),
    cacheConfig: CACHE_CONFIGS.SECTION_DATA,
  });
}

export async function getByYear(year: string, queryInput: QueryInput = {}): Promise<ListResponse> {
  const normalizedYear = normalizeYearParam(year);
  const query = parseListQuery(queryInput, { limit: 10 });
  const search = toListSearchParams(query);
  search.delete('year');

  return requestJson({
    pathname: `/v1/api/nam/${encodeURIComponent(normalizedYear)}`,
    schema: listResponseSchema,
    searchParams: search,
    cacheConfig: CACHE_CONFIGS.SECTION_DATA,
  });
}

export async function searchMovies(
  keyword: string,
  queryInput: QueryInput = {},
): Promise<SearchResponse> {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    throw new PhimApiClientError('Keyword is required.', 'invalid_query', 400);
  }

  const query = parseListQuery(queryInput, { limit: 32 });
  const search = toListSearchParams(query);
  search.set('keyword', normalizedKeyword);

  return requestJson({
    pathname: '/v1/api/tim-kiem',
    schema: searchResponseSchema,
    searchParams: search,
    cacheConfig: CACHE_CONFIGS.SEARCH_RESULTS,
  });
}

export async function getCategoryTaxonomy(): Promise<TaxonomyItem[]> {
  return requestJson({
    pathname: '/the-loai',
    schema: taxonomyListSchema,
    cacheConfig: CACHE_CONFIGS.SECTION_DATA,
  });
}

export async function getCountryTaxonomy(): Promise<TaxonomyItem[]> {
  return requestJson({
    pathname: '/quoc-gia',
    schema: taxonomyListSchema,
    cacheConfig: CACHE_CONFIGS.SECTION_DATA,
  });
}
