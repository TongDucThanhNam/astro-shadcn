# Agents instructions
You are an AI coding assistant working on the AstroFlim codebase. Keep responses short, actionable, and specific to this repository. NEVER CREATE DOCS OR TESTS.
You have given 2 MCP tool to help you:
- `search_astro_docs`: Search through Astro documentation
- `get_code_context_example`: Search relevant code in Github.

Project snapshot
- Framework: Astro (hybrid server + static); partial hydration used across components.
- UI: React components inside Astro (`.tsx`) + Astro components (`.astro`). Tailwind + shadcn used for design.
- Data: Canonical PhimAPI integration lives in `src/lib/phimapi/*`.

# AstroFilm Codebase Instructions

## Project Overview
**AstroFilm** is a movie discovery application built with **Astro 5 + React + Tailwind CSS**, using [PhimAPI](https://phimapi.com) as the upstream movie data provider.

### Tech Stack
- **Framework:** Astro 5.14.8 with React 18 integration
- **Styling:** Tailwind CSS 3.4 + shadcn/ui (Radix)
- **Design System:** Kinetic Typography (`docs/design_system.md`)
- **API:** PhimAPI (`.github/instructions/phim_api_instructions.md`)
- **Deployment:** Vercel serverless (SSR + cache headers)
- **Validation:** Zod runtime schemas for upstream payload safety

---

## Architecture & Data Flow

### 1) Routing & SSR
Primary routes in `src/pages/`:
- `/` and `/[page]` for latest movies (supports `?feed=v1|v2|v3`)
- `/phim/[slug]` for movie detail
- `/tim-kiem/[keyword]` for search
- `/danh-sach/[type]` and `/danh-sach/[type]/[page]` for type lists
- `/danh-sach/the-loai/[type]` for category lists
- `/danh-sach/quoc-gia/[type]` for country lists
- `/danh-sach/nam/[year]` for year lists

Internal API routes:
- `/api/sections/[typeList]` for section list data
- `/api/tmdb/[type]/[id]` for TMDB based lookup proxy

### 2) Canonical API Integration (single source of truth)
All upstream calls should go through:
- `src/lib/phimapi/client.ts` (methods + error handling)
- `src/lib/phimapi/query.ts` (query parsing/normalization/invariants)
- `src/lib/phimapi/schemas.ts` (Zod schemas + inferred TS types)
- `src/lib/phimapi/index.ts` (public exports)

Do **not** add direct `fetch("https://phimapi...")` from pages/components.

### 3) API Coverage (excluding WEBP by design)
Covered endpoints:
- `GET /danh-sach/phim-moi-cap-nhat`
- `GET /danh-sach/phim-moi-cap-nhat-v2`
- `GET /danh-sach/phim-moi-cap-nhat-v3`
- `GET /phim/{slug}`
- `GET /tmdb/{type}/{id}`
- `GET /v1/api/danh-sach/{type_list}`
- `GET /v1/api/tim-kiem`
- `GET /the-loai`
- `GET /v1/api/the-loai/{slug}`
- `GET /quoc-gia`
- `GET /v1/api/quoc-gia/{slug}`
- `GET /v1/api/nam/{year}`

Not in scope: `GET /image.php?url=...` (WEBP conversion endpoint).

### 4) Type & Validation Strategy
- Runtime validation by Zod happens before payload reaches UI.
- TS types are inferred from Zod schemas.
- Compatibility aliases still exist in:
  - `src/types/index.ts`
  - `src/pages/danh-sach/type.ts`
- Search `data.items` is normalized from `null` to `[]`.

---

## Development Workflows

### Local development
```bash
bun install
bun run dev
bun run build
bun run preview
```
Equivalent npm scripts are also available (`npm run dev`, `npm run build`, ...).

### Build process
1. `astro check` (type diagnostics)
2. `astro build` (SSR/server build)
3. Output in `dist/` with Vercel adapter packaging

### Environment
- Required env: `PUBLIC_PHIM_MOI`
- Example: `PUBLIC_PHIM_MOI=https://phimapi.com`

---

## Query & Data Invariants
Enforced in `src/lib/phimapi/query.ts`:
- `page >= 1`
- `1 <= limit <= 64`
- `sort_field in {modified.time, _id, year}`
- `sort_type in {asc, desc}`
- `sort_lang in {vietsub, thuyet-minh, long-tieng}` when provided
- slug format: `^[a-z0-9-]+$`
- year range: `1970..currentYear`
- TMDB type: `tv|movie`, TMDB id numeric

---

## Important Files
| File | Purpose |
|------|---------|
| `src/lib/phimapi/client.ts` | Canonical API client + typed errors |
| `src/lib/phimapi/query.ts` | Query normalization and guardrails |
| `src/lib/phimapi/schemas.ts` | Zod schemas + inferred response types |
| `src/pages/api/tmdb/[type]/[id].ts` | Internal TMDB proxy endpoint |
| `src/pages/api/sections/[typeList].ts` | Internal list section endpoint |
| `src/components/FilterPanel.astro` | Taxonomy + validated filter UI |
| `src/components/HeroMovie.astro` | Latest feed hero (v1/v2/v3 aware) |
| `src/components/MovieGrid.astro` | Latest list grid and feed-aware pagination |
| `src/lib/api-service.ts` | Section batching on top of canonical client |
| `docs/api-integration.md` | Canonical API integration reference |

---

## Common Tasks

### Add a new upstream endpoint
1. Add Zod schema in `src/lib/phimapi/schemas.ts`.
2. Add/extend query/path validation in `src/lib/phimapi/query.ts`.
3. Add method in `src/lib/phimapi/client.ts`.
4. Use that method from route/component (no direct upstream fetch).
5. Sync `docs/api-integration.md` endpoint matrix.

### Add a new filtered list page
1. Create route under `src/pages/danh-sach/...`.
2. Use `listQueryFromRequest()` + `parseListQuery()`.
3. Fetch via `getListByType()` or `getByCategory()` / `getByCountry()` / `getByYear()`.
4. Build page links with `toListSearchParams()`.

### Debug upstream shape issues
1. Inspect relevant Zod schema in `src/lib/phimapi/schemas.ts`.
2. Check thrown `PhimApiClientError` code (`invalid_payload`, `upstream_http_error`, ...).
3. Compare with payload notes in `docs/api-integration.md`.

---

## Deployment Notes
- **Host:** Vercel serverless
- **Adapter:** `@astrojs/vercel`
- **Output:** `server`
- **Caching:** via `Cache-Control` headers from `src/lib/cache.ts` + selective in-memory hot cache (`src/lib/server-cache.ts`)

---

## Known Limitations / Notes
- Upstream `status` type is inconsistent across endpoints (string/boolean); handled in schemas.
- Search can return `items: null`; normalized to `[]`.
- No Auth/Favorites subsystem yet.

---

## Bun AI Workflow (Manual Test + Feedback Loop)

### Canonical commands
```bash
bun run format
bun run ui:map
bun run ai:check || true
bun run tw:check || true
bun run ai:pack
```

### Manual test flow (human)
1. Start app: `bun run dev`.
2. Open one target route and note expected behavior before editing.
3. Ask AI to change one component only, attach `.ai/context.txt` + target file path.
4. Re-run: `bun run ui:map` and `bun run ai:pack`.
5. Refresh route and verify:
   - Layout unchanged outside requested scope
   - No broken spacing/overflow/flex/grid behavior
   - Component still composes via `className` and forwarded props

### Feedback packet format (for fast iteration)
Use this exact template when reporting result back to AI:
```txt
[RESULT] pass|fail
[ROUTE] /example-route
[COMPONENT] src/components/Example.tsx
[OBSERVED] what happened
[EXPECTED] what should happen
[REGRESSION] yes|no
[SCREENLESS_HINT] one concrete DOM/class clue (text-only)
```

### AI behavior on feedback
1. If `[RESULT]=fail`, apply minimal diff and keep previous contracts.
2. If `[REGRESSION]=yes`, prioritize rollback-safe fix before enhancement.
3. Always output exact changed files and commands to re-check.
