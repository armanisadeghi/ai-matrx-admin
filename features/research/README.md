# Research System Frontend

AI-powered research pipeline with human-in-the-loop curation. Searches the web, scrapes content, analyzes sources with specialized AI agents, and generates comprehensive research reports.

This route serves as the **reference implementation** for Next.js best practices across the project.

## Data Model

Projects (from existing project system) have a 1:many relationship with Research Topics (`rs_topic`). Each topic owns keywords, sources, content, analyses, syntheses, tags, documents, and media.

## Routes

All routes live under `app/(public)/p/research/`.

| Route | Description |
|-------|-------------|
| `/p/research` | Public landing page (Server Component — zero JS) |
| `/p/research/topics` | Authenticated topic list with project selector |
| `/p/research/topics/new` | Topic creation wizard (project > name > template > keywords > settings) |
| `/p/research/topics/[topicId]` | Topic overview dashboard with pipeline stats + JSON-LD |
| `/p/research/topics/[topicId]/sources` | Source list with URL-driven filters, bulk actions |
| `/p/research/topics/[topicId]/sources/[sourceId]` | Source detail with content viewer/editor, analysis |
| `/p/research/topics/[topicId]/keywords` | Keyword management (add/remove) |
| `/p/research/topics/[topicId]/document` | Markdown document viewer with TOC, version history, diff |
| `/p/research/topics/[topicId]/tags` | Tag CRUD with URL-driven search |
| `/p/research/topics/[topicId]/tags/[tagId]` | Per-tag consolidation view |
| `/p/research/topics/[topicId]/media` | Media gallery with relevance toggles |
| `/p/research/topics/[topicId]/costs` | LLM cost breakdown dashboard |
| `/p/research/topics/[topicId]/settings` | Topic settings |

## Architecture — Next.js Best Practices

### Rendering Strategy
- **Server Components** for all `page.tsx` and `layout.tsx` files — static shells with `<Suspense>` boundaries
- **Client Components** only at leaf nodes (interactive panels, forms, stream consumers)
- **`loading.tsx`** at every route segment — enables instant perceived navigation via skeleton prefetching
- **`error.tsx`** at research root and topic level — graceful error recovery without destroying layout
- **`not-found.tsx`** for invalid topic UUIDs — proper 404 with back navigation

### SEO
- **Static metadata** on research layout with `title.template` for child pages
- **`generateMetadata`** on topic layout — dynamic title, description, OG, Twitter from Supabase
- **JSON-LD** structured data (`ResearchProject` schema) on topic overview page
- **Canonical URLs** and proper `robots` directives

### State Management
- **Zustand store** (`state/topicStore.ts`) replaces React Context for topic/progress/stream state
- Components subscribe to specific slices via selector hooks — only re-render when their data changes
- **URL search params** for all filter, sort, search, and pagination state (shareable, bookmarkable, SSR-compatible)
- Backward-compatible `useTopicContext()` hook wraps Zustand selectors

### Performance
- **React Compiler** enabled — automatic memoization, no manual `useMemo`/`useCallback` needed
- **Preconnect hints** for Supabase and Python backend in research layout
- **`ResearchLanding`** is a Server Component (zero client JS for the landing page)
- **`PublicHeader`** uses `dynamic()` with `ssr: false` for auth/theme — non-blocking initial render
- **Root layout** isolated from schema system (only loaded in authenticated routes)

### Data Fetching Strategy

| Source | Used For |
|--------|----------|
| **Supabase (direct)** | Topic CRUD, keyword reads/deletes, source reads/updates, content reads, synthesis reads, tag CRUD, document reads, media reads, template reads |
| **Python API** | Suggest (LLM), create topic (template logic), add keywords (validation), search/scrape/analyze/synthesize (SSE streams), run pipeline, document generation, tag consolidation/suggestion, content versioning, links aggregation, costs aggregation |

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useTopicContext()` | Full topic state (backward compat — wraps Zustand) |
| `useTopicId()` | Just the topic ID (most components only need this) |
| `useTopicData()` | Topic + loading + error (no progress, no refresh) |
| `useTopicProgress()` | Pipeline progress only |
| `useStreamDebug()` | Stream debug events for overlay |
| `useResearchApi()` | Python API methods wrapping `useBackendApi` |
| `useResearchStream()` | NDJSON streaming with progress tracking |
| `useSourceFilters()` | URL-driven filter state management |

## Mobile UX

- `useIsMobile()` conditional rendering throughout
- Bottom navigation bar on mobile, sidebar on desktop
- Dialogs become Drawers on mobile (bottom sheets)
- `dvh` units, `pb-safe`, 16px input fonts, 44pt touch targets

## Dependencies

- `zustand` — Zustand store for topic/stream state
- `react-markdown` + `remark-gfm` — document rendering
- `react-diff-viewer-continued` — version comparison
