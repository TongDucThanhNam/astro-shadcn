# AstroFilm — Agent Instructions

You are an AI coding assistant on **AstroFilm**. Keep responses short, actionable, and repository-specific. **NEVER CREATE DOCS OR TESTS.**

## Project Identity
Movie discovery app — **Astro 5 + React 18 + Tailwind 4 + shadcn/ui**, data from [PhimAPI](https://phimapi.com), deployed on **Vercel SSR**.

## MCP Tools
- `search_astro_docs` — Astro documentation search
- `get_code_context_example` — GitHub code search

---

## 🚨 HARD GATE — UI Edits Require Visual Hierarchy

**IF** you are about to change styling, layout, or Tailwind classes in **any** file under `src/components/`, `src/layouts/`, `src/styles/`, or `src/pages/**/*.astro`:

**STOP. Do NOT write code yet.** First:

1. Look up the **actual file path** from the **Route Map** below (e.g. `/danh-sach/phim-le` → `src/pages/danh-sach/[type].astro`)
2. Run this command with that **real file path** (NOT the URL):

```bash
bun scripts/generate-ui-map.ts --src src --entry src/pages/PAGE_FILE.astro --out docs/ui-map --alias @=src
```

⚠️ `--entry` must be an **actual file on disk** (e.g. `src/pages/danh-sach/[type].astro`), NOT a URL route (~~`src/pages/danh-sach/phim-le`~~). Astro uses dynamic params like `[type]`, `[slug]`, `[page]` in filenames.

3. **Read the output**:
```bash
cat docs/ui-map.ascii.txt
```

This gives you the parent→child component tree with Tailwind wrapper classes at each level. Example:
```
[Layout] (flex flex-col min-h-screen)
└── [FilterPanel] (sticky top-16 z-30 border-b)
    ├── [Combobox] (relative w-full)
    └── [Button] (inline-flex items-center gap-2)
```

**WHY this is mandatory:** Without this tree, you don't know the parent's layout strategy (flex? grid? fixed? relative?) and will generate Tailwind classes that conflict with the container. This is the #1 cause of broken UI from AI edits.

**Only after reading and understanding the hierarchy tree, proceed to edit code.**

For full UI conventions → read [ui.instructions.md](.github/instructions/ui.instructions.md).

---

## Task Router

Read the **domain-specific instructions** based on what you're working on:

| You are editing… | Auto-loaded instructions | Key concern |
|---|---|---|
| `src/components/**`, `src/layouts/**`, `src/styles/**` | [ui.instructions.md](.github/instructions/ui.instructions.md) | **Visual Hierarchy workflow** — MUST generate tree before UI edits |
| `src/lib/**`, `src/types/**` | [data.instructions.md](.github/instructions/data.instructions.md) | API client, Zod schemas, query invariants |
| `src/pages/api/**` | [data.instructions.md](.github/instructions/data.instructions.md) | Internal API endpoints |
| `src/pages/**/*.astro` | Both **ui** + **data** — pages wire data to templates | Routing + SSR |
| `scripts/**`, `package.json`, `astro.config.*` | [ops.instructions.md](.github/instructions/ops.instructions.md) | Build, deploy, dev commands |
| Any file | [phim_api.instructions.md](.github/instructions/phim_api.instructions.md) | Upstream API reference (always loaded) |

## Route Map
| Route | Page file |
|---|---|
| `/`, `/[page]` | `src/pages/index.astro`, `src/pages/[page].astro` |
| `/phim/[slug]` | `src/pages/phim/[slug].astro` |
| `/tim-kiem/[keyword]` | `src/pages/tim-kiem/[keyword].astro` |
| `/danh-sach/[type]` | `src/pages/danh-sach/[type].astro` |
| `/danh-sach/the-loai/[type]` | `src/pages/danh-sach/the-loai/[type].astro` |
| `/danh-sach/quoc-gia/[type]` | `src/pages/danh-sach/quoc-gia/[type].astro` |
| `/danh-sach/nam/[year]` | `src/pages/danh-sach/nam/[year].astro` |
| `/api/sections/[typeList]` | `src/pages/api/sections/[typeList].ts` |
| `/api/tmdb/[type]/[id]` | `src/pages/api/tmdb/[type]/[id].ts` |

## Global Rules
1. All upstream API calls go through `src/lib/phimapi/*` — **no direct fetch**.
2. TS types inferred from Zod schemas — never duplicate.
3. Use `cn()` from `src/lib/utils.ts` for class merging.
4. No Auth/Favorites subsystem yet.
