# Research System — Planning & Considerations

## Server-Side Architecture (Python/FastAPI)

### Service Layer Design

```
scraper/scraper_enhanced/features/research/
├── GOAL.md                  # Vision & requirements
├── DATABASE_PROPOSAL.md     # Table design & SQL migration
├── PLANNING.md              # This file — plans & considerations
├── ARMAN_FACTS.md           # Owner notes & existing table schemas
├── service.py               # Core orchestration (create research, run steps, manage state)
├── search.py                # Search execution & result storage
├── scraper.py               # Scrape orchestration & content storage
├── analysis.py              # LLM analysis per page
├── tagging.py               # Tag management & assignment
├── consolidation.py         # Tag-based consolidation
├── document.py              # Final document assembly
└── models.py                # Pydantic models for request/response
```

### API Endpoints (FastAPI)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **Project & Config** | | |
| POST | `/research/init` | Initialize research on an existing project (creates `research_config`) |
| GET | `/research/{project_id}` | Get research state with full pipeline status |
| PATCH | `/research/{project_id}` | Update research config (autonomy level, thresholds, etc.) |
| **Keywords** | | |
| POST | `/research/{project_id}/keywords` | Add keywords |
| DELETE | `/research/{project_id}/keywords/{id}` | Remove a keyword |
| PATCH | `/research/{project_id}/keywords/{id}` | Mark stale, update params |
| **Search** | | |
| POST | `/research/{project_id}/search` | Execute search for all/specific keywords |
| POST | `/research/{project_id}/search/{keyword_id}` | Execute search for one keyword |
| **Sources** | | |
| GET | `/research/{project_id}/sources` | List all sources (with filters: status, hostname, keyword, included, type) |
| POST | `/research/{project_id}/sources` | Manually add a URL/source |
| PATCH | `/research/{project_id}/sources/{id}` | Toggle inclusion, mark stale, update status |
| PATCH | `/research/{project_id}/sources/bulk` | Bulk update sources (include/exclude, etc.) |
| **Scraping & Content** | | |
| POST | `/research/{project_id}/scrape` | Scrape all/specific pending sources |
| POST | `/research/{project_id}/sources/{id}/scrape` | Scrape a single source |
| POST | `/research/{project_id}/sources/{id}/content` | Submit manual content (paste/extension/file) |
| GET | `/research/{project_id}/sources/{id}/content` | Get content versions |
| PATCH | `/research/{project_id}/content/{id}` | Edit/clean content, override quality |
| **Links & Media** | | |
| GET | `/research/{project_id}/links` | Get all extracted links across sources |
| POST | `/research/{project_id}/links/add-to-scope` | Add extracted links as new sources |
| GET | `/research/{project_id}/media` | Get all media across sources |
| PATCH | `/research/{project_id}/media/{id}` | Mark media as relevant/irrelevant |
| **Analysis** | | |
| POST | `/research/{project_id}/sources/{id}/analyze` | Run LLM analysis on a source |
| POST | `/research/{project_id}/analyze-all` | Run analysis on all unanalyzed sources |
| **Tags** | | |
| GET | `/research/{project_id}/tags` | List tags |
| POST | `/research/{project_id}/tags` | Create/manage tags |
| POST | `/research/{project_id}/sources/{id}/tags` | Assign tags to a source |
| PATCH | `/research/{project_id}/source-tags/{id}` | Update tag assignment (primary source, confidence) |
| **Consolidation & Document** | | |
| POST | `/research/{project_id}/tags/{id}/consolidate` | Run LLM consolidation for a tag |
| POST | `/research/{project_id}/document` | Generate/regenerate final document |
| GET | `/research/{project_id}/document` | Get current document |
| GET | `/research/{project_id}/document/versions` | Get document version history |
| **Full Pipeline** | | |
| POST | `/research/{project_id}/run` | Execute full/partial pipeline (autonomy-aware) |

### Streaming & Progress

- Long operations (search, scrape, LLM analysis) use SSE streaming via the existing `Emitter` protocol.
- Each step emits progress events so the UI can show real-time status.
- The `_emit_progress` pattern from `mcp_tool_helpers.py` is the model.

### The Initial Pass (Auto/Semi Flow)

When `autonomy_level = 'auto'` or `'semi'`, the initial pipeline runs:

**Step 0 — Setup (fast LLM call, optional)**
- User enters research subject + optional template.
- Small LLM generates: suggested keywords list, project title, description.
- Optionally: quick web search for minimal context → LLM provides initial insights as structured JSON.
- User picks top 2 keywords (or provides them manually if no template/LLM).

**Step 1 — Search (cheap, save everything)**
- Brave search runs for both keywords.
- **All results saved** (up to ~60–100 per keyword). Search is the cheapest step.
- Sources created, `keyword_result_link` populated.

**Step 2 — Scrape (target: 5 good per keyword = 10 total)**
- Top URLs scraped concurrently.
- Target: 5 non-thin scrapes per keyword (configurable via `research_config.scrapes_per_keyword`).
- Content, images, links all extracted and stored.
- Stream progress to frontend in real time.

**Step 3 — Three-Tier Analysis (all results saved individually)**

| Tier | Agent Call | Input | Output | Saved To |
|------|-----------|-------|--------|----------|
| A — Per-page summary | 10 calls (1 per scrape) | Single page content | Individual summary | `source_analysis` |
| B — Per-keyword synthesis | 2 calls (1 per keyword) | Top 20 search results + 5 page summaries | Keyword-level analysis | `research_synthesis` (scope=keyword) |
| C — Full research report | 1 call | All search results + all scrape summaries + both keyword syntheses | Initial complete research report | `research_synthesis` (scope=project) |

Total LLM calls for initial pass: **13** (10 per-page + 2 per-keyword + 1 full report).

**Step 4 — Present to User**
- Initial document, all search results, scrape statuses, pipeline overview.
- User iterates from here.

### Iteration Modes

After the initial pass, the user can iterate by modifying sources (add/remove/re-scrape) and then choosing how to regenerate:

**Option 1 — Rebuild**
- Fresh synthesis ignoring excluded sources, incorporating new ones.
- Already-summarized pages are NOT re-analyzed (per-page summaries reused).
- Per-keyword syntheses and full report regenerated from scratch.
- `research_synthesis.iteration_mode = 'rebuild'`.

**Option 2 — Update**
- An "Updater Agent" receives: previous research report + list of removed sources + all new information.
- Makes targeted updates rather than starting over.
- Better for small additions (1–2 new sources) or incremental refinement.
- `research_synthesis.iteration_mode = 'update'`, `previous_synthesis_id` links to prior version.
- Can happen at keyword level (update one keyword's synthesis) or project level (update the full report).

Both modes preserve the tree: existing per-page summaries are never lost, only the higher-level syntheses are regenerated.

---

## Client-Side Considerations (React/TypeScript)

### UI Screens (Preliminary)

1. **Project Dashboard** — Shows all projects. Research projects get a "Research" badge/indicator.

2. **Research Overview** — Pipeline visualization showing:
   - Keywords (count, stale indicators)
   - Sources (count by status: pending, success, thin, failed, complete)
   - Analyses (count done / total)
   - Tags (count, consolidation status)
   - Document (current version, last generated)
   - Progress bars or step indicators for where the research is in the pipeline.

3. **Search Results / Source List** — Table/list of all sources with:
   - Toggle switches for inclusion/exclusion
   - Scrape status badges (color-coded)
   - Source type icons (web, YouTube, PDF, manual)
   - Origin badges (search, manual, link extraction)
   - Keyword association count (found by N keywords)
   - Bulk actions: scrape selected, exclude all from domain, mark stale, etc.
   - Filters: by keyword, hostname, status, inclusion, source type, origin

4. **Scrape Content Review** — Side-by-side or tabbed view:
   - Left: metadata (URL, title, status, quality, capture method, version history)
   - Right: full text with inline editing for cleanup
   - Actions: mark as good/bad/complete, flag for re-scrape, submit manual content
   - Version comparison (diff view between content versions)

5. **Link Explorer** — All links extracted from all scraped pages:
   - **Excludes URLs already in scope** (existing research sources) to avoid duplicates
   - Grouped by source page
   - "Add to scope" button for each link (creates new `research_source` with `origin = 'link_extraction'`)
   - Filters: external only by default (toggle to include internal), domain, source page

6. **Media Gallery** — All images/videos found across sources:
   - Grid view with thumbnails
   - Toggle relevant/irrelevant
   - Source attribution

7. **Tagging Interface** — Tag management + assignment:
   - Tag list with drag-and-drop reordering
   - Source ↔ tag matrix or checkbox interface
   - Primary source indicator per tag
   - Auto-tag suggestions from LLM

8. **Analysis View** — Per-source LLM results:
   - Expandable cards per source
   - Multiple analysis types side-by-side
   - Re-run with different agent/model

9. **Consolidation View** — Per-tag consolidated content:
   - Editable text per tag section
   - Source citations/references
   - Version history

10. **Document View** — Final assembled document:
    - Section navigation (one section per tag consolidation)
    - Edit sections inline
    - Regenerate individual sections or full document
    - Export options (markdown, PDF, etc.)
    - Version history

### Chrome Extension Integration

The extension already captures HTML to `html_extractions`. For research:
- Extension shows a "Research Tasks" tab with failed/thin scrapes from all the user's research projects.
- Grouped by project or shown as a flat list.
- User navigates to a URL, extension captures content, sends to backend.
- Backend creates a new `research_source_content` row with `capture_method = 'chrome_extension'` and `linked_extraction_id` pointing to the `html_extractions` row.
- Source's `scrape_status` updated to `success` or `complete`.

### Real-Time Updates

- SSE connection for long-running operations (search, scrape, analysis).
- Optimistic UI updates for toggles, status changes, tag assignments.
- Polling fallback for simpler state checks.

---

## Delta Tracking Strategy

### Search Deltas

When a keyword is re-searched:
1. New results: added with `discovered_at = now()`, `last_seen_at = now()`.
2. Previously seen URLs: `last_seen_at` updated.
3. URLs not in new results: keep old `last_seen_at` (signals potential staleness).
4. New URLs can be flagged in UI as "new since last search."

### Scrape Deltas

When a URL is re-scraped:
1. New `research_source_content` row created with incremented `version`.
2. Previous version's `is_current` set to `false`.
3. `content_hash` compared: if unchanged, new version optionally discarded or kept with note.
4. If content changed: downstream analyses flagged as stale.

### Analysis Cascade (Tree Model)

When content changes:
- Analyses referencing that content are stale → can be re-run.
- Tag consolidations that included that content's source are stale → can be re-consolidated.
- Document is stale → can be regenerated.
- **Key principle:** Updating a branch doesn't break other branches. The user can follow one branch through to completion without affecting others.

---

## Multi-Source Content Types

| Source Type | Capture Flow |
|-------------|-------------|
| **Web page** | Auto-scrape → parse HTML → extract text, images, links |
| **YouTube** | Auto-detect YouTube URL → store as `source_type = 'youtube'` with `scrape_status = 'pending'`. User manually triggers transcription → pipeline produces transcript → linked via `transcripts` table. Content + summary stored. |
| **PDF** | Auto-scrape detects PDF → `extract_text_from_pdf_bytes()` → store text |
| **Manual paste** | User pastes text in UI → stored directly |
| **Chrome extension** | User visits URL → extension captures → linked via `html_extractions` |
| **File upload** | User uploads PDF/doc/etc. → extraction pipeline → store text |
| **Link extraction** | User selects links from scraped pages → added as new sources |
| **Desktop companion** | Companion app captures content → same API as Chrome extension |

---

## Agent System Integration

### Philosophy: AI Agents as the Differentiator

The research system's LLM processing is powered by the platform's **AI Agent/Prompt system** — not hardcoded prompt strings. This means:

1. **Built-in generic agents** ship with the system for default behavior (summarize, extract entities, etc.).
2. **Specialized workflow agents** can replace generics for specific research types. A "Company Research Agent" processes pages differently than a "Scientific Research Agent."
3. **Agents can use custom tools and MCP tools** for domain-specific tasks (e.g., a medical research agent might query a drug database via MCP).
4. **Templates wire agents to research types.** A "Company Research" template pre-configures which agents handle each step.

### Agent Types (Built-In Defaults)

| Agent Type | Purpose |
|------------|---------|
| `summarizer` | General page summary — concise overview of key information |
| `entity_extractor` | Extract structured entities (people, places, companies, dates, contacts) |
| `fact_checker` | Cross-reference claims against other scraped sources |
| `key_info_extractor` | Extract specific fields based on project context (address, phone, services) |
| `relevance_scorer` | Score how relevant this source is to the research topic |
| `topic_tagger` | Auto-suggest tags for a source based on content |

### Specialized Workflow Agents (Template-Driven)

These replace the generic defaults when a template is applied:

| Template | Example Specialized Agent | Difference from Generic |
|----------|--------------------------|------------------------|
| Company Research | Company Profile Extractor | Knows to look for address, phone, services, leadership, founding date, revenue, certifications |
| Scientific Research | Academic Content Analyzer | Prioritizes methodology, findings, citations, statistical data, peer review status |
| Marketing Analysis | Brand & Positioning Analyzer | Extracts brand messaging, target audience signals, competitive positioning, pricing |
| Person Research | Bio & Background Compiler | Focuses on career history, education, publications, social presence, affiliations |
| Product Research | Feature & Comparison Extractor | Extracts specs, pricing, reviews, pros/cons, competitive comparison points |

### Agent Trigger Rules

- **All LLM analysis is user-triggered** (never automatic) — LLM calls cost money.
- Users can trigger one source at a time ("Analyze this page") or in bulk ("Analyze all unanalyzed sources").
- YouTube transcription is always manual-trigger — user clicks to process a specific video.
- The power is in the **connection**: a processed transcript is stored, linked, summarized, and tagged — nothing is lost.

### Agent Execution Pattern (Existing Infrastructure)

Agents are invoked via the platform's `Agent` class (see `ai/system_agents.py` for reference):

```python
agent = await Agent.from_prompt("uuid-of-prompt-builtin")
agent.set_session(SimpleSession(conversation_id=child_ctx.conversation_id))

agent.set_variable("topic", "All Green Electronics Recycling")
agent.set_variable("scraped_content", content_text)
agent.set_variable("search_results", search_results_text)

result = await agent.execute()
# result.output → text/JSON output
# result.usage → token usage dict
# result.usage_history → list of TokenUsage
# result.metadata → extra metadata
```

**Key points:**
- Each agent is a `prompt_builtin` with a UUID. It has a predetermined model, instructions, tools, etc.
- **Variables** make agents highly consistent: structured input → structured output. The agent is given the research topic as a variable, not as a chat message.
- Agents can produce text or structured JSON output (configurable per agent).
- This means agent calls are essentially **code** — deterministic input/output, no conversation required.
- Users can customize built-in agents or create interchangeable replacements.

### How `agent_config` Works

The `research_config.agent_config` JSONB field maps pipeline steps to platform agent IDs:

```json
{
  "page_summary_agent_id": "uuid — per-page summary (Tier A)",
  "keyword_synthesis_agent_id": "uuid — per-keyword synthesis (Tier B)",
  "research_report_agent_id": "uuid — full research report (Tier C)",
  "updater_agent_id": "uuid — update iteration mode",
  "consolidation_agent_id": "uuid — tag consolidation",
  "document_agent_id": "uuid — final document assembly",
  "transcript_agent_id": "uuid — video/audio transcript processing"
}
```

When null or missing, the system falls back to built-in generic agents. When populated (typically by a template), the specified platform agent handles that step, bringing its own instructions, variables, tools, and MCP connections.

### Variables Per Agent Type

| Agent Step | Key Variables |
|------------|---------------|
| Page Summary (Tier A) | `topic`, `page_content`, `page_url`, `page_title` |
| Keyword Synthesis (Tier B) | `topic`, `keyword`, `search_results`, `page_summaries` |
| Research Report (Tier C) | `topic`, `all_search_results`, `all_page_summaries`, `keyword_syntheses` |
| Updater | `topic`, `previous_report`, `removed_sources`, `new_information` |
| Tag Consolidation | `topic`, `tag_name`, `tagged_page_contents`, `tagged_page_summaries` |
| Document Assembly | `topic`, `tag_consolidations`, `research_report` |
| Transcript Processing | `topic`, `transcript_text`, `video_title`, `video_url` |

---

## Implementation Priority

### Phase 1 — Core Pipeline (MVP)
1. Database tables (Supabase migration)
2. `research_config` + keyword management
3. Search execution + source storage
4. Scrape execution + content storage
5. Basic UI: research overview, source list, content viewer

### Phase 2 — Human Curation
6. Source inclusion/exclusion toggles
7. Content cleanup interface (edit + version)
8. Manual content submission (paste)
9. Stale marking & re-execution
10. Quality override (mark thin as complete)

### Phase 3 — Multi-Source & Media
11. Link explorer (extracted links → add to scope)
12. Media gallery (images/videos from sources)
13. YouTube transcript integration
14. Chrome extension scrape task list
15. File upload content capture

### Phase 4 — Analysis & Tagging
16. Per-source LLM analysis
17. Tag management
18. Tag assignment (manual + auto-suggest)
19. Tag-based consolidation

### Phase 5 — Document Assembly
20. Final document generation from consolidations
21. Section-by-section regeneration
22. Version history
23. Export formats (markdown, PDF, DOCX)

### Phase 6 — Advanced Features
24. Delta tracking & change detection
25. Research templates (company, person, topic presets)
26. Auto-tagging agent
27. Cost tracking dashboard
28. Scheduled re-searches
29. Desktop companion integration

---

## Risk Considerations

- **Storage costs:** Large text in Postgres. Monitor row sizes; consider table partitioning by project if volumes get extreme.
- **LLM costs:** Per-source analysis across 100+ sources can be expensive. Need cost visibility and user awareness. Consider per-project cost caps.
- **Rate limiting:** Brave Search API limits. Need queuing and graceful degradation. Currently 1 req/sec with retry logic.
- **Stale data:** Without automated re-checking, research becomes outdated. Scheduled re-searches as a Phase 6 feature.
- **Scope creep:** This system can become very complex. MVP must stay focused on the core pipeline: search → scrape → curate → summarize → document.

---

## Q&A Log

### Round 1 — Foundational Questions (Answered)

**Q1 — Research Project Scope**
> Is a research project always about a single entity?

**A:** Yes, single entity for MVP. But the entity can be anything — company, person, scientific topic ("latest advancements in cardiac surgery"), product category, etc. The system must be entity-agnostic.

**Q2 — Multi-Keyword URL Deduplication**
> Should we track which keywords found which URLs?

**A:** Yes. Lightweight `keyword_result_link` join table. Relevance signal from multi-keyword overlap is valuable.

**Q3 — Content Storage: Postgres vs S3**
> Start with Postgres TEXT or S3 from day one?

**A:** Postgres TEXT. No S3 for this feature. Keep it simple. 99% of the database is already Postgres.

**Q4 — Scrape Content Editing: Track Diffs or Just Final?**
> Store only cleaned version or keep original with new version?

**A:** Option (b) — versioned. New row with `capture_method = 'manual_edit'`, `version += 1`. Original preserved.

**Q5 — Who Is the Primary User?**
> Internal team, end customers, or both?

**A:** Both. Everyone will use this — medical research, marketing, internal use. Design backend for both from the start.

**Q6 — Automated vs Manual Trigger Philosophy**
> Auto-run, manual trigger, or configurable?

**A:** Configurable (option C). Default: lightweight auto-run first (2 keywords, moderate scraping, LLM summary), then human iterates. Users set autonomy level. System must support going back to fix a branch and following it through without breaking other branches.

**Q7 — Chrome Extension: Build Scope**
> Existing or new build?

**A:** Chrome extension and desktop companion already exist. Extension captures HTML to `html_extractions` table. Plan: show failed/thin scrape URLs in extension, user visits and captures, content flows back. Also: user can mark thin scrapes as "complete" if that's really all there was.

**Additional feedback from Round 1:**
- **No Django.** All database work is Supabase PostgreSQL + custom ORM + Supabase MCP tools.
- **Non-text sources are critical:** YouTube videos (transcription pipeline exists), PDFs, other file types, images.
- **Link exploration:** Users should be able to see all links found on scraped pages and add them to the research scope.
- **`projects` table already exists.** Research links to it via `research_config`, not a standalone container.
- **`tasks` table exists** but may over-complicate things. Extension scrape tasks driven by querying source status instead.

### Round 2 — Implementation Specifics (Answered)

**Q8 — The `research_config` Pattern: Feature Extension Model**
> Any project can "enable" research, or is research its own project type?

**A:** Option (a) — any existing project can enable research on demand. `research_config` is created when the user starts research on a project. The `projects.settings` JSONB can track enabled features: `{"research": true, ...}`.

**Q9 — Autonomy Level Granularity**
> Single project-level setting or per-step settings?

**A:** Option (a) — single project-level setting (`auto`, `semi`, `manual`). "Semi" means: run a lightweight pass automatically, then prompt for each step. Per-step granularity can live in `metadata` JSONB later if needed.

**Q10 — Extracted Links: Scope Expansion**
> How should link exploration work?

**A:** Keep it simple. Show extracted links, **exclude URLs already in scope** (existing research sources), let users review and add the relevant ones. External links only by default. No auto-inheritance of tags — user tags explicitly after reviewing new source content.

**Q11 — YouTube Integration Flow**
> Auto-detect and auto-transcribe, or manual trigger?

**A:** Manual trigger always. YouTube URLs are stored as sources with `source_type = 'youtube'` and `scrape_status = 'pending'`. User explicitly triggers transcription (costs money). The power is in the **connection** — the system properly stores, links, and surfaces the transcript content. Showing a list of YouTube links with a "Process" button is more powerful than auto-processing because it demonstrates the system is properly connected. Bulk processing option available too.

**Q12 — Extension Scrape Tasks**
> Dedicated task table or query-based approach?

**A:** Option (a) — no extra table. Extension queries `GET /research/extension/scrape-queue` which reads live source status. Always up to date, no sync issues.

**Q13 — Research Templates**
> Build template system from the start?

**A:** Yes, Phase 2 but designed now. Templates pre-populate keywords, tags, search params, AND most importantly **wire in specialized agents** via `agent_config`. The platform's AI Agent/Prompt system is the core differentiator — templates connect research workflows to domain-expert agents. 3–5 initial templates: Company Research, Scientific Research, Marketing Analysis, Person Research, Product Research. Each template uses agents with domain-specific instructions, custom tools, and MCP tool access.

**Additional feedback from Round 2:**
- **AI Agents are the key differentiator.** The platform's Agent/Prompt system powers all LLM processing. Templates wire specialized agents into research workflows. Agents can have custom tools and MCP tools.
- **YouTube transcription is always manual.** The value is in the connection and storage, not automation.
- **Link explorer excludes existing sources.** Only shows genuinely new URLs to avoid noise from overlap.
- **`research_config.agent_config`** JSONB maps pipeline steps to platform agent IDs, falling back to built-in generics when null.

### Round 3 — Pipeline Mechanics & Agent Integration (Answered)

**Q14 — The Lightweight Auto-Run: What Exactly Happens?**
> What's the exact sequence for the initial automated pass?

**A:** Detailed three-tier pipeline:
1. Setup: User provides subject + optional template. LLM suggests keywords (cheap, fast). User picks 2.
2. Search: Brave search for both keywords. **Save all results** (60–100 per keyword). Search is cheapest.
3. Scrape: Target **5 good scrapes per keyword = 10 total** (hard preset, configurable).
4. Three-tier LLM analysis (13 total calls, all saved individually):
   - **Tier A:** 10 per-page summaries → `source_analysis`
   - **Tier B:** 2 per-keyword syntheses (search results + page summaries) → `research_synthesis`
   - **Tier C:** 1 full research report (everything) → `research_synthesis`
5. Present: initial document + all search results + pipeline overview.
6. **Iteration modes:** User chooses Rebuild (fresh synthesis, reuse per-page summaries) or Update (agent modifies previous report with delta).

**Q15 — Scrape Status State Machine**
> Is the proposed state machine complete?

**A:** Yes, good starting point. Will likely evolve as we learn our own system.

**Q16 — Research Overview Pipeline View**
> Strict progression, "furthest reached", or computed progress?

**A:** Option (c) — computed from data. `status` field is mostly cosmetic. Real progress = "45 sources, 30 scraped, 12 analyzed, 3 tags consolidated."

**Q17 — Agent Config Granularity**
> Should `agent_config` specify model, instructions, tools per step?

**A:** Keep `agent_config` as just agent ID references. All intelligence lives in the agent definition. Agents use **variables** for structured input → structured output. The agent is essentially code: `Agent.from_prompt(uuid)` → `.set_variable()` → `.execute()` → `AgentResult`. Agents have predetermined model, instructions, tools. Users can customize or create interchangeable replacements.

**Q18 — Initial Seed Templates**
> Are the 5 proposed templates correct?

**A:** Confirmed:
1. Company Research, 2. Scientific Research, 3. Person Research, 4. Product Research, 5. Marketing Analysis.

**Additional feedback from Round 3:**
- **LLM keyword generation is cheap** — no reason not to do it. User enters subject → LLM suggests keywords + title + description. Optionally: quick web search for initial context → LLM provides structured JSON insights.
- **The three-tier analysis forces proper connections.** Per-page → per-keyword → full report creates a clear tree. Adding keywords adds branches. The tree can be re-walked at any level.
- **Two iteration modes are essential:** Rebuild (fresh synthesis, reuse existing summaries) and Update (agent modifies with delta). User chooses per iteration.
- **Agent variables are the key.** `set_variable("topic", ...)` makes agents deterministic code, not chat. This is exactly how the initial pass works — no conversation needed.
