# Scraper hooks

## `useScraperApi`

Primary hook for all scraper HTTP endpoints (Python backend, NDJSON streaming).

Location: `hooks/useScraperApi.ts`

Methods: `scrapeUrl`, `scrapeUrls`, `search`, `searchAndScrape`, `searchAndScrapeLimited`, `cancel`, `reset`.

Used by routes under `app/(transitional)/scraper/` and `parts/ScraperFloatingWorkspace.tsx`.

## `useScraperAgentAnalysis`

One-shot agent runs for full-scrape analysis tabs (Fact Checker, Keyword Analysis).

Wraps `useRunAgent` with streaming text state and abort-on-unmount. Agent and variable slot UUIDs live in `constants/analysis-agents.ts`.

See `features/agents/migration/MIGRATE-recipe-to-agent-execution.md` for the migration pattern.

## `useScraperKeywordSearchForm`

Keyword search for the Search Lab (`/scraper/search`) and the floating
workspace's search mode. Runs on `runKindSearch` (`POST /search-kinds/search`);
engine `brave | google | compare`, result type, options, per-engine `runs`
(kind + request + raw + ignored options + elapsed ms). `flatResults` is derived
from the kind. A search only runs on `handleSearch` — never on a keystroke.
