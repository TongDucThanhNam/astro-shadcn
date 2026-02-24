const SLUG_RE = /^[a-z0-9-]+$/;
const MIN_YEAR = 1970;
const MAX_YEAR = new Date().getFullYear();

export const SORT_FIELDS = ['modified.time', '_id', 'year'] as const;
export const SORT_TYPES = ['asc', 'desc'] as const;
export const SORT_LANGS = ['vietsub', 'thuyet-minh', 'long-tieng'] as const;
export const FEED_VERSIONS = ['v1', 'v2', 'v3'] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortType = (typeof SORT_TYPES)[number];
export type SortLang = (typeof SORT_LANGS)[number];
export type LatestFeedVersion = (typeof FEED_VERSIONS)[number];
export type TmdbType = 'tv' | 'movie';

export interface ListQuery {
  page: number;
  sortField: SortField;
  sortType: SortType;
  sortLang?: SortLang;
  category?: string;
  country?: string;
  year?: string;
  limit: number;
}

export type QueryInput =
  | URLSearchParams
  | Record<string, string | number | null | undefined>
  | ListQuery;

function readValue(source: QueryInput, key: string): string | number | null | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key);
  }

  const sourceRecord = source as Record<string, string | number | null | undefined>;
  if (typeof sourceRecord[key] !== 'undefined') {
    return sourceRecord[key];
  }

  const mappedKey =
    key === 'sort_field'
      ? 'sortField'
      : key === 'sort_type'
        ? 'sortType'
        : key === 'sort_lang'
          ? 'sortLang'
          : undefined;

  if (!mappedKey) {
    return undefined;
  }

  return sourceRecord[mappedKey];
}

function parsePositiveInt(value: string | number | null | undefined, fallback: number) {
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw) || raw < 1) {
    return fallback;
  }

  return Math.trunc(raw);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseSortField(value: string | number | null | undefined): SortField {
  if (typeof value !== 'string') {
    return 'modified.time';
  }

  if ((SORT_FIELDS as readonly string[]).includes(value)) {
    return value as SortField;
  }

  return 'modified.time';
}

function parseSortType(value: string | number | null | undefined): SortType {
  if (typeof value !== 'string') {
    return 'desc';
  }

  if ((SORT_TYPES as readonly string[]).includes(value)) {
    return value as SortType;
  }

  return 'desc';
}

function parseSortLang(value: string | number | null | undefined): SortLang | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  if ((SORT_LANGS as readonly string[]).includes(value)) {
    return value as SortLang;
  }

  return undefined;
}

function parseSlug(value: string | number | null | undefined, fieldName: string) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (!SLUG_RE.test(normalized)) {
    throw new Error(`Invalid ${fieldName} value.`);
  }

  return normalized;
}

function parseYearValue(value: string | number | null | undefined): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const year = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(year)) {
    throw new Error('Invalid year value.');
  }

  const normalized = Math.trunc(year);
  if (normalized < MIN_YEAR || normalized > MAX_YEAR) {
    throw new Error(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
  }

  return String(normalized);
}

export function parseListQuery(source: QueryInput, defaults: Partial<ListQuery> = {}): ListQuery {
  const page = parsePositiveInt(readValue(source, 'page'), defaults.page ?? 1);
  const limit = clamp(parsePositiveInt(readValue(source, 'limit'), defaults.limit ?? 10), 1, 64);

  const query: ListQuery = {
    page,
    limit,
    sortField: parseSortField(readValue(source, 'sort_field') ?? defaults.sortField),
    sortType: parseSortType(readValue(source, 'sort_type') ?? defaults.sortType),
    sortLang: parseSortLang(readValue(source, 'sort_lang') ?? defaults.sortLang),
    category: parseSlug(readValue(source, 'category') ?? defaults.category, 'category'),
    country: parseSlug(readValue(source, 'country') ?? defaults.country, 'country'),
    year: parseYearValue(readValue(source, 'year') ?? defaults.year),
  };

  return query;
}

export function toListSearchParams(query: ListQuery): URLSearchParams {
  const search = new URLSearchParams();
  search.set('page', String(query.page));
  search.set('sort_field', query.sortField);
  search.set('sort_type', query.sortType);
  search.set('limit', String(query.limit));

  if (query.sortLang) {
    search.set('sort_lang', query.sortLang);
  }

  if (query.category) {
    search.set('category', query.category);
  }

  if (query.country) {
    search.set('country', query.country);
  }

  if (query.year) {
    search.set('year', query.year);
  }

  return search;
}

export function listQueryFromRequest(searchParams: URLSearchParams): QueryInput {
  const query: Record<string, string> = {};
  for (const key of [
    'page',
    'sort_field',
    'sort_type',
    'sort_lang',
    'category',
    'country',
    'year',
    'limit',
  ]) {
    const value = searchParams.get(key);
    if (value) {
      query[key] = value;
    }
  }

  return query;
}

export function parseFeedVersion(input: string | null | undefined): LatestFeedVersion {
  if (input && (FEED_VERSIONS as readonly string[]).includes(input)) {
    return input as LatestFeedVersion;
  }

  return 'v1';
}

export function normalizeTypeList(input: string, fieldName = 'type_list'): string {
  const value = input.trim().toLowerCase();
  if (!value || !SLUG_RE.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return value;
}

export function normalizeTmdbType(input: string): TmdbType {
  if (input === 'tv' || input === 'movie') {
    return input;
  }

  throw new Error('tmdb type must be tv or movie.');
}

export function normalizeTmdbId(input: string): string {
  const value = input.trim();
  if (!/^\d+$/.test(value)) {
    throw new Error('tmdb id must be numeric.');
  }

  return value;
}

export function normalizeYearParam(input: string): string {
  const year = parseYearValue(input);
  if (!year) {
    throw new Error('Invalid year path parameter.');
  }

  return year;
}
