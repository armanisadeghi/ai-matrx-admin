# Research System Frontend

AI-powered research pipeline with human-in-the-loop curation. Searches the web, scrapes content, analyzes sources with specialized AI agents, and generates comprehensive research reports.

## Data Model

Projects (from existing project system) have a 1:many relationship with Research Topics (`rs_topic`, renamed from `rs_config`). Each topic owns keywords, sources, content, analyses, syntheses, tags, documents, and media.

## Routes

All routes live under `app/(public)/p/research/`.

| Route | Description |
|-------|-------------|
| `/p/research` | Public landing page with marketing content |
| `/p/research/topics` | Authenticated topic list with project selector |
| `/p/research/topics/new` | Topic creation wizard (project > name > template > keywords > settings) |
| `/p/research/topics/[topicId]` | Topic overview dashboard with pipeline stats |
| `/p/research/topics/[topicId]/sources` | Source list with filters, bulk actions, include/exclude toggles |
| `/p/research/topics/[topicId]/sources/[sourceId]` | Source detail with content viewer/editor, analysis |
| `/p/research/topics/[topicId]/keywords` | Keyword management (add/remove) |
| `/p/research/topics/[topicId]/documents` | Markdown document viewer with TOC, version history, diff |
| `/p/research/topics/[topicId]/tags` | Tag CRUD management with consolidation triggers |
| `/p/research/topics/[topicId]/tags/[tagId]` | Per-tag consolidation view |
| `/p/research/topics/[topicId]/media` | Media gallery with relevance toggles |
| `/p/research/topics/[topicId]/costs` | LLM cost breakdown dashboard |

## Architecture

- **Server Components** for all `page.tsx` files — static shells with `<Suspense>` boundaries
- **Client Components** lazy-loaded via `React.lazy()` for interactivity
- **Direct Supabase queries** (`service.ts`) for all DB-only reads (topics, keywords, sources, tags, documents, media, templates)
- **Python API** (`useResearchApi`) only for server-side logic (LLM calls, streaming, multi-table aggregation, content versioning)
- **`TopicProvider`** context at the topic layout level for shared state
- **`consumeStream()`** from `lib/api/stream-parser.ts` for NDJSON streaming

## Data Fetching Strategy

| Source | Used For |
|--------|----------|
| **Supabase (direct)** | Topic CRUD, keyword reads/deletes, source reads/updates, content reads, synthesis reads, tag CRUD, document reads, media reads, template reads |
| **Python API** | Suggest (LLM), create topic (template logic), add keywords (validation), search/scrape/analyze/synthesize (SSE streams), run pipeline, document generation, tag consolidation/suggestion, content versioning, links aggregation, costs aggregation |

## Key Hooks

| Hook | Purpose |
|------|---------|
| `useResearchApi()` | Python API method set wrapping `useBackendApi` |
| `useResearchStream()` | NDJSON streaming with progress tracking |
| `useTopicsForProject()` | Supabase query for topics in a project |
| `useResearchKeywords()` | Supabase query for topic keywords |
| `useResearchSources()` | Supabase query with filter support |
| `useResearchTemplates()` | Supabase query for templates |
| `useSourceFilters()` | URL-driven filter state management |

## Mobile UX

- `useIsMobile()` conditional rendering throughout
- Bottom navigation bar on mobile, sidebar on desktop
- Dialogs become Drawers on mobile (bottom sheets)
- `dvh` units, `pb-safe`, 16px input fonts, 44pt touch targets

## Dependencies

- `react-markdown` + `remark-gfm` — document rendering
- `react-diff-viewer-continued` — version comparison
