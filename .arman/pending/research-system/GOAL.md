# Research System — Core Goal & Requirements

## Vision

Build a **database-driven, step-by-step research pipeline** that takes one or more keywords (topics, companies, people, scientific subjects, etc.) and produces a comprehensive, maintainable research document — persisting every intermediate result so that nothing is ever lost and any step can be re-run independently.

The system must support **human-in-the-loop curation** at every stage, from selecting which search results matter to tagging pages with the specific information they contribute. Users can set the level of autonomy — from fully automated lightweight research to careful step-by-step manual curation.

---

## What Already Exists

### Current Pipeline (Ephemeral)

Two scripts handle the current research flow, but **nothing is persisted to a database**:

| File | Purpose |
|------|---------|
| `top_n_brave_results.py` | Single-keyword deep search: fetches ~100 unique URLs from Brave Search API (paginated, up to 10 pages), concurrently scrapes the top N (3–30 based on effort level), returns raw JSON + formatted text. |
| `mcp_tool_helpers.py` | Multi-keyword version with streaming + LLM summarization: fires all searches concurrently, scrapes top 5 URLs per query, classifies scrapes as "good" (≥1000 chars) vs "thin", then passes everything to a (deprecated) summarization agent. |

### Data Flow Today

```
Keywords → Brave Search API → Search Results (JSON)
    → URL extraction → Concurrent scraping → Content extraction (HTML/PDF/Image/Text)
        → Text formatting → (Optional) LLM summarization → Final text output
```

**Key problem:** Every run starts from scratch. There is no persistence, no delta tracking, no curation, and no way to incrementally improve results.

### Existing Database Infrastructure

- **PostgreSQL via Supabase** — the primary database. No Django ORM.
- **Custom ORM** built in-house for standard read/write patterns.
- **Supabase MCP tools** available for direct database interaction.
- **`projects` table** — generic project system already exists with organization/user ownership, members, invitations. Research will link to this.
- **`tasks` table** — generic task system with project association, status tracking, assignments. Could be used for scrape tasks but may over-complicate things.
- **`html_extractions` table** — Chrome extension content capture (url, title, html_content, meta_description, user_agent, user_id). Already in place.
- **`transcripts` table** — YouTube/audio/video transcript storage with segments, metadata, source_type, tags. Already handles video content.
- **Scrape infrastructure** — `scrape_parsed_page`, `scrape_task`, `scrape_task_response`, `scrape_domain`, etc. Existing scraper persistence with S3 for large content.

### What the Current Code Captures Per Search Result

From the Brave Search API response, each result contains:
- `title`, `url`, `description`, `page_age`/`age`
- `profile` (name, url, favicon)
- `meta_url` (scheme, netloc, hostname, favicon, path)
- `thumbnail` (src, original)
- `extra_snippets` (array of text snippets)
- `cluster` (related sub-pages from the same domain)
- `type`, `subtype`, `language`, `family_friendly`

From scraping, each result gains:
- `scraped_content` (full extracted text)
- `scrape_failure_reason` (if failed)
- Content type handling: HTML, PDF, Image, JSON, XML, Markdown, Plain Text
- `char_count`, `is_good_scrape` (≥1000 chars threshold)
- `date_info` (published_at, modified_at)

### Parser Capabilities (Relevant to Research)

The HTML parser (`scraper_enhanced/parser`) extracts:
- **`ai_research_content`** — text-only content (headers, text, tables, lists, quotes)
- **`ai_research_with_images`** — content including images and videos
- **Images** — structured objects with src, alt, width, height, caption, srcset
- **Videos** — structured objects with src, poster, provider (e.g., "youtube")
- **Links** — preserved as markdown links in content; separate link extraction available via `LinkExtractor`

---

## Requirements

### R1 — Step-by-Step Execution with Persistence

Each stage of the pipeline must be independently executable and its results persisted:

1. **Search** — Execute keyword searches, store all results.
2. **Scrape** — Fetch page content for selected URLs, store outcomes.
3. **Curate** — Human reviews and includes/excludes results.
4. **Clean** — Human reviews scraped text, removes junk, re-flags quality.
5. **Tag** — Pages are tagged with the specific information they contribute (e.g., "address", "services", "news").
6. **Summarize** — LLM processes individual pages or groups of tagged pages.
7. **Consolidate** — Final research document assembled from all summaries.

Each step can also be run as part of a full automated pipeline.

### R2 — Human-in-the-Loop with Configurable Autonomy

- Users set the autonomy level at project creation: fully automated → semi-automated → fully manual.
- **Default auto/semi flow (the "Initial Pass"):**
  1. User enters research subject, optionally picks a template.
  2. LLM quickly suggests keywords + title + description (cheap, fast). User picks top 2 keywords. If no template and no LLM, user provides 2 keywords manually.
  3. Brave search runs for both keywords — **all results saved** (up to ~60–100 per keyword). Search is cheap; save everything.
  4. Top URLs scraped: target **5 good (non-thin) scrapes per keyword = 10 total**.
  5. Three-tier LLM analysis (all saved individually):
     - **A) Per-page summary:** Each of the 10 scrapes → summarized by agent → 10 individual summaries saved.
     - **B) Per-keyword synthesis:** Agent gets top 20 search results + 5 scrapes for that keyword → keyword-level analysis → 2 keyword summaries saved.
     - **C) Full research report:** Agent gets all search results + all scrapes + all summaries → generates initial complete research document.
  6. User presented with: the initial document, all search results, scrape statuses, and the pipeline overview.
- **Iteration modes (user chooses per iteration):**
  - **Option 1 — Rebuild:** Modify sources and re-run from scratch. Already-summarized pages are not re-processed, but the final document is regenerated fresh, ignoring excluded sources and incorporating new ones.
  - **Option 2 — Update:** An "Updater Agent" receives the previous research, a list of removed sources, and all new information. The agent makes targeted updates rather than starting over. Better for small additions (1–2 new sources) or incremental refinement.
- Users can toggle inclusion/exclusion of individual search results before scraping.
- Users can review and clean scraped text (remove junk, flag low quality).
- Users can mark searches or scrapes as stale for future refresh.
- Users can override scrape failures with manual content (copy/paste, Chrome extension, residential IP re-scrape).
- Users can mark thin/failed scrapes as "actually complete" when the thin content is all there was.

### R3 — Multiple Keywords

- A single research project can have multiple keywords.
- Results are deduplicated across keywords (by URL), tracked via join table.
- Each keyword's search can be run independently and at different times.

### R4 — Multi-Source Content Capture

When automated scraping fails or for non-text sources:
- **Chrome extension** — already exists; captures HTML to `html_extractions` table. Shows failed/thin scrape URLs for the user to visit. No extra task table — extension queries live source status.
- **Desktop companion app** — already exists; connected to the web version.
- **Manual copy/paste** — user pastes content directly into the UI.
- **YouTube videos** — transcription pipeline exists; `transcripts` table stores results. **Transcription is always manual-trigger** (requires LLM cost). YouTube URLs are stored as sources; user clicks to trigger transcription. The power is in the connection: the source links to the transcript, content and summary are stored, nothing is lost.
- **PDFs** — existing PDF-to-text extraction.
- **Other file types** — existing converters for various formats to text/structured content.
- **Images** — parser extracts image metadata; users can mark images as relevant to keep with the research.
- **Links found on pages** — users can browse all links extracted from scraped pages and add new URLs to the research scope. Already-seen URLs (existing sources) are excluded from the link list to avoid duplicates.

### R5 — Quality & Staleness Tracking

- Scrapes have quality indicators: good (≥threshold), thin, failed.
- Users can override quality assessment (e.g., mark thin as "complete — that's all there was").
- Searches and scrapes can be marked "stale" to trigger re-execution.
- Delta tracking: detect when search results change or page content changes.

### R6 — Per-Source LLM Processing (Agent-Powered)

- Users can trigger individual source summarization/analysis — **manually, not auto-triggered** (LLM calls have cost).
- Bulk triggers available: "analyze all unanalyzed sources" or "analyze selected."
- Multiple specialized agents available, powered by the platform's **AI Agent/Prompt system** — the core differentiator.
- **Built-in generic agents** handle default analysis (summarizer, entity extractor, etc.).
- **Specialized workflow agents** can replace generics for specific use cases: a "Company Research Agent" processes pages differently than a "Scientific Research Agent."
- Agents can be empowered with **custom tools and MCP tools** for domain-specific tasks.
- Results stored per-source, per-agent-type.

### R7 — Tag-Based Consolidation

- Pages tagged with information categories (e.g., "address", "services", "leadership", "news").
- A single page can have multiple tags.
- One page can be the "primary source" for a tag (trusted source for that information).
- Consolidation agents process all pages sharing a tag to produce a unified section.
- Tags act as the bridge between raw page content and the final research document structure.

### R8 — Final Research Document

- Assembled from tag-based consolidations.
- Can be regenerated at any time from current data.
- Individual sections can be updated independently.
- Version history maintained.

### R9 — Delta Tracking & Cost Efficiency

- Never redo work unnecessarily.
- Track 1:1 relationship: URL found in search → scraped content → summarization.
- Detect when search results change (new URLs appear, old ones disappear).
- Detect when page content changes (hash comparison).
- Only re-process what has actually changed.
- Tree-like flow: can go back, fix a branch, and follow it through without breaking unrelated branches.

### R10 — Frontend Documentation

- All server-side logic built in Python/FastAPI.
- Detailed requirements and API documentation produced for the React/TypeScript team.
- UI must support every human-in-the-loop interaction described above.

### R11 — Link to Existing Project System

- Research links to the existing `projects` table, not a standalone container.
- This connection pattern should serve as a template for how other features connect to the project/task system.
- Research-specific data lives in dedicated tables, but the parent project provides ownership, organization, members, and permissions.

---

## Architecture Principle

**The database is the source of truth.** Every step reads from and writes to the database. The pipeline can be paused and resumed at any point. The UI is a window into the database state, allowing humans to curate, override, and trigger the next step.

**The topic is entity-agnostic.** Research can be about a company, a person, a scientific topic ("latest advancements in cardiac surgery"), a product category, or anything else. The system never assumes the subject type.

**The power is in the connections.** The system's value comes from properly connecting sources to content to analysis to the final document — and making every connection visible and actionable. A YouTube video that's been transcribed, summarized, and tagged is more valuable than a perfectly scraped web page that sits in isolation.

**AI Agents are the differentiator.** The platform's Agent/Prompt system powers all LLM processing. Agents are invoked via `Agent.from_prompt(uuid)` with `.set_variable()` for structured input and `.execute()` for consistent output. Built-in generic agents handle defaults, but specialized workflow agents (Company Research, Scientific Research, Marketing Analysis, etc.) can be wired in with domain-specific instructions, custom tools, and MCP tool access. This transforms the research system from a generic scraper into a domain-expert research assistant. Users can customize or create their own agents that are interchangeable with the built-in ones.

**The data path is a clear tree:**
```
Topic → Keywords → Search Results → Scrapes → Per-page Summaries → Per-keyword Synthesis → Full Research Report
```
Each node in this tree is persisted. Adding a keyword adds a branch. Removing a source prunes a branch. The tree can be re-walked at any level without losing the rest.
