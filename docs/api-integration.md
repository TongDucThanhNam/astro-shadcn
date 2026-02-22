# PhimAPI Integration (Canonical)

## Scope
This project integrates all official movie endpoints except `image.php` (WEBP conversion), by design.

Live payloads in this document were sampled from `https://phimapi.com` on **2026-02-22**.

## Canonical Source Of Truth
- Client methods: `src/lib/phimapi/client.ts`
- Query parsing and validation: `src/lib/phimapi/query.ts`
- Runtime schemas + TypeScript inferred types: `src/lib/phimapi/schemas.ts`
- Public exports: `src/lib/phimapi/index.ts`

Do not call upstream endpoints directly from pages/components anymore.

## Endpoint Coverage Matrix
| Upstream endpoint | Canonical method | App route(s) using it |
|---|---|---|
| `GET /danh-sach/phim-moi-cap-nhat` | `getLatestMovies({ feedVersion: "v1" })` | `/`, `/[page]` |
| `GET /danh-sach/phim-moi-cap-nhat-v2` | `getLatestMovies({ feedVersion: "v2" })` | `/?feed=v2`, `/[page]?feed=v2` |
| `GET /danh-sach/phim-moi-cap-nhat-v3` | `getLatestMovies({ feedVersion: "v3" })` | `/?feed=v3`, `/[page]?feed=v3` |
| `GET /phim/{slug}` | `getMovieDetail(slug)` | `/phim/[slug]` |
| `GET /tmdb/{type}/{id}` | `getMovieByTmdb(type, id)` | `/api/tmdb/[type]/[id]` |
| `GET /v1/api/danh-sach/{type_list}` | `getListByType(typeList, query)` | `/danh-sach/[type]`, `/danh-sach/[type]/[page]`, `BatchedHomeSections` |
| `GET /v1/api/tim-kiem` | `searchMovies(keyword, query)` | `/tim-kiem/[keyword]` |
| `GET /the-loai` | `getCategoryTaxonomy()` | `FilterPanel` |
| `GET /v1/api/the-loai/{slug}` | `getByCategory(slug, query)` | `/danh-sach/the-loai/[type]` |
| `GET /quoc-gia` | `getCountryTaxonomy()` | `FilterPanel` |
| `GET /v1/api/quoc-gia/{slug}` | `getByCountry(slug, query)` | `/danh-sach/quoc-gia/[type]` |
| `GET /v1/api/nam/{year}` | `getByYear(year, query)` | `/danh-sach/nam/[year]` |

## Query Contract (validated)
Canonical list query fields:
- `page`: integer >= 1
- `limit`: integer `1..64`
- `sort_field`: `modified.time | _id | year`
- `sort_type`: `asc | desc`
- `sort_lang`: `vietsub | thuyet-minh | long-tieng` (optional)
- `category`: slug regex `^[a-z0-9-]+$` (optional)
- `country`: slug regex `^[a-z0-9-]+$` (optional)
- `year`: `1970..currentYear` (optional)

See parser: `parseListQuery()` in `src/lib/phimapi/query.ts`.

## Normalized Runtime Behavior
- Upstream JSON is validated with Zod before entering UI layer.
- Search `data.items` can be `null` upstream and is normalized to `[]`.
- Invalid payload fails fast with `PhimApiClientError(code="invalid_payload")`.
- Invalid slug/year/tmdb params fail fast as `invalid_query` style errors.

## Latest Feed Version Differences
Minimal field diff by item:
- `v1`: basic item fields (`name`, `slug`, `poster_url`, `thumb_url`, `year`, `tmdb`, `imdb`, `modified`).
- `v2`: `v1 + status + episode_current`.
- `v3`: `v2 + type + sub_docquyen + time + quality + lang + category + country`.

`v3` pagination may include `updateToday`.

## Live Payload Notes (sampled)
Source: `phimapi.com` endpoints, accessed 2026-02-22.

1. `GET /v1/api/tim-kiem?keyword=...`
- `status` is a string (`"success"`).
- `data.items` may be `null` on empty result.

2. `GET /v1/api/danh-sach/phim-bo?page=1`
- `status` observed as boolean.
- `data.items[*]` includes full list metadata (`type`, `time`, `quality`, `lang`, `category`, `country`, `created`, `modified`).

3. `GET /quoc-gia` and `GET /the-loai`
- Response is array of `{ _id, name, slug }`.

4. `GET /phim/{slug}` and `GET /tmdb/{type}/{id}`
- Both return `movie` + `episodes` shape with server data keys `name`, `slug`, `filename`, `link_embed`, `link_m3u8`.

## Error Contract
Client throws `PhimApiClientError`:
- `missing_config`: `PUBLIC_PHIM_MOI` missing.
- `invalid_query`: invalid slug/year/tmdb id/type.
- `upstream_http_error`: upstream non-2xx.
- `invalid_json`: upstream body is not JSON.
- `invalid_payload`: JSON shape mismatch against schema.

## Adding A New Endpoint
1. Add endpoint method in `src/lib/phimapi/client.ts`.
2. Add/extend Zod schema in `src/lib/phimapi/schemas.ts`.
3. Add query/path validation in `src/lib/phimapi/query.ts` if needed.
4. Use new method from page/API route. Avoid direct `fetch("https://phimapi...")`.
5. Update this file's endpoint matrix and payload notes.
