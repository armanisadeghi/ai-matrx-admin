# Research System Frontend

AI-powered research pipeline with human-in-the-loop curation. Searches the web, scrapes content, analyzes sources with specialized AI agents, and generates comprehensive research reports.

## Routes

All routes live under `app/(public)/p/research/`.

| Route | Description |
|-------|-------------|
| `/p/research` | Public landing page with marketing content |
| `/p/research/[projectId]` | Overview dashboard with pipeline stats |
| `/p/research/[projectId]/new` | Research init wizard (subject > template > keywords > autonomy) |
| `/p/research/[projectId]/sources` | Source list with filters, bulk actions, include/exclude toggles |
| `/p/research/[projectId]/sources/[sourceId]` | Source detail with content viewer/editor, version history, analysis |
| `/p/research/[projectId]/document` | Markdown document viewer with TOC, version history, diff, export |
| `/p/research/[projectId]/tags` | Tag CRUD management with consolidation triggers |
| `/p/research/[projectId]/tags/[tagId]` | Per-tag consolidation view |
| `/p/research/[projectId]/links` | Extracted link explorer with "Add to Scope" |
| `/p/research/[projectId]/media` | Media gallery with relevance toggles |
| `/p/research/[projectId]/costs` | LLM cost breakdown dashboard |

## Architecture

- **Server Components** for all `page.tsx` files — static shells with `<Suspense>` boundaries
- **Client Components** lazy-loaded via `React.lazy()` for interactivity
- **React Query** for data fetching with smart caching and invalidation
- **`useBackendApi()`** hook for all Python backend API calls (handles auth, URL resolution)
- **`consumeStream()`** from `lib/api/stream-parser.ts` for NDJSON streaming
- **`ResearchProvider`** context at the project layout level for shared state

## API Integration

- Python backend endpoints under `/api/research/` — defined in `service/research-endpoints.ts`
- Endpoint constants also registered in `lib/api/endpoints.ts`
- Types auto-generated from Python OpenAPI schema in `types/python-generated/api-types.ts`
- Frontend-specific types in `features/research/types.ts`

## Key Hooks

| Hook | Purpose |
|------|---------|
| `useResearchApi()` | Full API method set wrapping `useBackendApi` |
| `useResearchStream()` | NDJSON streaming with progress tracking |
| `useResearchState()` | React Query wrapper for project state with polling |
| `useSourceFilters()` | URL-driven filter state management |

## Mobile UX

- `useIsMobile()` conditional rendering throughout
- Bottom navigation bar on mobile, sidebar on desktop
- Dialogs become Drawers on mobile (bottom sheets)
- Tabs stacked vertically on mobile
- `dvh` units, `pb-safe`, 16px input fonts, 44pt touch targets

## Dependencies

- `react-markdown` + `remark-gfm` — document rendering
- `react-diff-viewer-continued` — version comparison
- `@tanstack/react-query` — data fetching
