# Research System — Big Picture Phases

## Overview

This document outlines the phased implementation plan. Each phase builds on the previous one, delivering a usable increment. Work spans **Python (backend)**, **React/TypeScript (frontend)**, **Chrome Extension**, and **AI Agents (prompt builtins)**.

The phases are ordered to get a **working end-to-end pipeline as early as possible**, then layer on curation, multi-source, and advanced features.

---

## Phase 1 — Foundation: Database + Search + Scrape + Storage

**Goal:** Establish the database, run searches, scrape pages, and store everything. No UI yet — API-driven, testable from Python.

### Python Backend

| # | Task | Details |
|---|------|---------|
| 1.1 | Run Supabase migration | Create all 13 tables (research_template → research_document). Can be done via Supabase MCP `apply_migration`. |
| 1.2 | Pydantic models | Request/response models for all entities: `ResearchConfig`, `ResearchKeyword`, `ResearchSource`, `ResearchSourceContent`, etc. |
| 1.3 | Research service core | `service.py` — init research on a project (creates `research_config`), add keywords, get pipeline state. |
| 1.4 | Search service | `search.py` — execute Brave search for a keyword, store all results as `research_source` rows + `keyword_result_link`. Handle deduplication (existing URL → update `last_seen_at`, add `keyword_result_link`). |
| 1.5 | Scrape service | `scraper.py` — scrape top N sources for a keyword, store `research_source_content` with content, hash, char_count, extracted_links, extracted_images. Update `research_source.scrape_status`. |
| 1.6 | FastAPI endpoints (core) | `POST /research/init`, `POST /research/{id}/keywords`, `POST /research/{id}/search`, `POST /research/{id}/scrape`, `GET /research/{id}` (full state), `GET /research/{id}/sources`. |
| 1.7 | Streaming integration | Wire search + scrape to emit SSE progress events via existing `Emitter` protocol. |

### React Frontend

| # | Task | Details |
|---|------|---------|
| 1.8 | Research init flow | Simple form: research subject name → optional template picker → keyword entry/confirmation → "Start Research" button. |
| 1.9 | Research overview page | Pipeline progress view: computed stats (sources count by status, keywords, etc.). |
| 1.10 | Source list view | Table of all `research_source` rows with status badges, hostname, title, rank. Filters by keyword, status, hostname. |
| 1.11 | SSE integration | Real-time progress updates during search and scrape operations. |

### Deliverable
User can create a research project, add keywords, run search, see all results, trigger scrape, see content stored. Everything persisted. No LLM calls yet.

---

## Phase 2 — The Initial Pass: Three-Tier LLM Analysis

**Goal:** Wire in agents to produce the initial research document automatically. This is the core "wow" moment.

### AI Agents (Prompt Builtins)

| # | Task | Details |
|---|------|---------|
| 2.1 | Create generic Page Summary agent | Prompt builtin with variables: `topic`, `page_content`, `page_url`, `page_title`. Produces concise summary. |
| 2.2 | Create generic Keyword Synthesis agent | Variables: `topic`, `keyword`, `search_results`, `page_summaries`. Produces keyword-level analysis. |
| 2.3 | Create generic Research Report agent | Variables: `topic`, `all_search_results`, `all_page_summaries`, `keyword_syntheses`. Produces full initial research report. |
| 2.4 | Create generic Updater agent | Variables: `topic`, `previous_report`, `removed_sources`, `new_information`. Modifies existing report. |

### Python Backend

| # | Task | Details |
|---|------|---------|
| 2.5 | Analysis service | `analysis.py` — run per-page summary agent on a source's content. Store in `source_analysis`. Support bulk execution. |
| 2.6 | Synthesis service | `consolidation.py` — run per-keyword synthesis, full research report. Store in `research_synthesis`. Handle both `initial` and `rebuild`/`update` iteration modes. |
| 2.7 | Full pipeline orchestrator | `service.py` — `run_initial_pass()`: search → scrape → Tier A (10 per-page) → Tier B (2 per-keyword) → Tier C (1 full report). All streamed. |
| 2.8 | FastAPI endpoints (analysis) | `POST /research/{id}/sources/{sid}/analyze`, `POST /research/{id}/analyze-all`, `POST /research/{id}/synthesize`, `POST /research/{id}/run` (full pipeline). |
| 2.9 | LLM setup assistant | `POST /research/{id}/suggest` — small LLM call to suggest keywords + title + description from subject name. |

### React Frontend

| # | Task | Details |
|---|------|---------|
| 2.10 | Initial pass UI | "Run Research" button triggers full pipeline. Progress shown in real-time via SSE. |
| 2.11 | Research document viewer | Display the generated research document (markdown rendered). |
| 2.12 | Per-source analysis viewer | Expandable cards showing each source's summary. |
| 2.13 | Iteration UI | After initial pass: "Add keywords" → "Re-run" with choice of Rebuild vs Update mode. |

### Deliverable
User enters a topic → system generates a full research document in ~2–3 minutes. 13 LLM calls, all persisted. User can iterate with Rebuild or Update mode.

---

## Phase 3 — Human Curation: Review, Edit, Override

**Goal:** Let the user curate the research — include/exclude sources, clean content, mark quality, re-scrape.

### Python Backend

| # | Task | Details |
|---|------|---------|
| 3.1 | Source curation endpoints | `PATCH /research/{id}/sources/{sid}` — toggle `is_included`, `is_stale`, `scrape_status` override. `PATCH /research/{id}/sources/bulk` for bulk operations. |
| 3.2 | Content editing | `PATCH /research/{id}/content/{cid}` — save edited content as new version (`capture_method = 'manual_edit'`, increment version, mark previous `is_current = false`). |
| 3.3 | Manual content submission | `POST /research/{id}/sources/{sid}/content` — accept pasted text, store as `research_source_content` with `capture_method = 'manual_paste'`. |
| 3.4 | Quality override | Allow marking thin scrapes as `complete`, marking bad scrapes as `good`, etc. via `quality_override` field. |

### React Frontend

| # | Task | Details |
|---|------|---------|
| 3.5 | Source list enhancements | Toggle switches for include/exclude. Bulk select + actions (exclude all from domain, scrape selected, mark stale). |
| 3.6 | Content review/edit page | Side-by-side: metadata left, editable content right. Version history dropdown. Save creates new version. |
| 3.7 | Manual paste modal | Paste content for failed/thin scrapes. |
| 3.8 | Scrape status overrides | Buttons: "Mark as Complete", "Re-scrape", "Mark Stale". |

### Deliverable
User can fully curate the research: remove irrelevant sources, fix bad scrapes, paste missing content, mark thin pages as complete, and re-run synthesis with curated data.

---

## Phase 4 — Templates + Specialized Agents

**Goal:** Pre-built research workflows with domain-expert agents. Users can pick a template and get a tailored experience.

### AI Agents (Prompt Builtins)

| # | Task | Details |
|---|------|---------|
| 4.1 | Company Research agents | Specialized page summary, keyword synthesis, and research report agents tuned for business information extraction. |
| 4.2 | Scientific Research agents | Tuned for academic content, methodology, findings, citations. |
| 4.3 | Person Research agents | Tuned for career history, education, publications, social presence. |
| 4.4 | Product Research agents | Tuned for specs, pricing, reviews, competitive comparison. |
| 4.5 | Marketing Analysis agents | Tuned for brand messaging, target audience, competitive positioning. |

### Python Backend

| # | Task | Details |
|---|------|---------|
| 4.6 | Seed templates | Insert 5 `research_template` rows with `keyword_templates`, `default_tags`, `agent_config` pointing to the specialized agents. |
| 4.7 | Template application | When initializing research with a template: populate keywords from patterns, create tags, set `agent_config`. |
| 4.8 | Template CRUD endpoints | `GET /research/templates`, `POST /research/templates` (user-created), `PATCH /research/templates/{id}`. |

### React Frontend

| # | Task | Details |
|---|------|---------|
| 4.9 | Template picker | Visual template selection during research init. Shows description, default keywords, tags. |
| 4.10 | Template preview | Before applying: show what keywords, tags, and agents will be configured. |

### Deliverable
User picks "Company Research" template → system pre-configures keywords, tags, and specialized agents → research is immediately domain-aware.

---

## Phase 5 — Tagging & Consolidation

**Goal:** Tag-based information categorization and per-tag LLM consolidation for structured document assembly.

### AI Agents (Prompt Builtins)

| # | Task | Details |
|---|------|---------|
| 5.1 | Tag consolidation agent | Variables: `topic`, `tag_name`, `tagged_page_contents`, `tagged_page_summaries`. Produces unified section for a tag. |
| 5.2 | Auto-tagger agent | Variables: `topic`, `page_content`, `available_tags`. Suggests tags for a page. |
| 5.3 | Document assembly agent | Variables: `topic`, `tag_consolidations`, `research_report`. Produces final polished document. |

### Python Backend

| # | Task | Details |
|---|------|---------|
| 5.4 | Tag CRUD | `POST/GET/PATCH/DELETE /research/{id}/tags`. |
| 5.5 | Source tagging | `POST /research/{id}/sources/{sid}/tags` — assign tags with primary_source flag. |
| 5.6 | Tag consolidation | `POST /research/{id}/tags/{tid}/consolidate` — run consolidation agent on all sources with this tag. |
| 5.7 | Auto-tag suggestion | `POST /research/{id}/sources/{sid}/suggest-tags` — run auto-tagger agent, return suggestions. |
| 5.8 | Document assembly | `POST /research/{id}/document` — assemble from tag consolidations. Store in `research_document`. |

### React Frontend

| # | Task | Details |
|---|------|---------|
| 5.9 | Tag management UI | Create/edit/reorder tags. Drag-and-drop or checkbox source-tag assignment. Primary source indicator. |
| 5.10 | Consolidation view | Per-tag consolidated content. Editable. Source citations. |
| 5.11 | Document view | Final document with section navigation, inline editing, version history. |
| 5.12 | Auto-tag suggestions | "Suggest Tags" button on source detail → shows LLM suggestions → user confirms/rejects. |

### Deliverable
User tags sources with categories → consolidation agents produce unified sections → document agent assembles the final polished research document. Full structured output with version history.

---

## Phase 6 — Multi-Source: Links, Media, YouTube, Extension

**Goal:** Expand beyond web scraping to YouTube, PDFs, file uploads, Chrome extension capture, and link exploration.

### Python Backend

| # | Task | Details |
|---|------|---------|
| 6.1 | Link explorer endpoint | `GET /research/{id}/links` — aggregate `extracted_links` across all content, exclude existing sources. |
| 6.2 | Add links to scope | `POST /research/{id}/links/add-to-scope` — create `research_source` rows with `origin = 'link_extraction'`. |
| 6.3 | Media endpoint | `GET /research/{id}/media` — aggregate `source_media`. `PATCH /research/{id}/media/{mid}` — toggle relevance. |
| 6.4 | YouTube integration | Detect YouTube URLs, set `source_type = 'youtube'`. `POST /research/{id}/sources/{sid}/transcribe` — trigger transcription pipeline, link result via `linked_transcript_id`. |
| 6.5 | File upload | `POST /research/{id}/sources/upload` — accept PDF/doc uploads, extract text, create source + content. |
| 6.6 | Extension scrape queue | `GET /research/extension/scrape-queue` — return all failed/thin sources across user's projects. |
| 6.7 | Extension content submit | `POST /research/{id}/sources/{sid}/extension-content` — accept HTML from extension, parse, store as content with `capture_method = 'chrome_extension'`, link to `html_extractions`. |

### React Frontend

| # | Task | Details |
|---|------|---------|
| 6.8 | Link explorer page | Grouped by source page, "Add to scope" buttons, filters (external/domain). |
| 6.9 | Media gallery | Grid view with thumbnails, relevance toggles. |
| 6.10 | YouTube source cards | Video thumbnail, "Transcribe" button, transcript viewer when done. |
| 6.11 | File upload UI | Drag-and-drop zone for PDFs and documents. |

### Chrome Extension

| # | Task | Details |
|---|------|---------|
| 6.12 | Research scrape queue tab | New tab in extension: list of failed/thin URLs from user's research projects. Grouped by project. |
| 6.13 | One-click capture | User navigates to URL → extension button captures content → sends to backend. |
| 6.14 | Status sync | After capture, source status updates in both extension and web UI. |

### Deliverable
Full multi-source research: web, YouTube, PDFs, file uploads, Chrome extension capture, and link exploration. Every source type flows into the same pipeline.

---

## Phase 7 — Polish: Delta Tracking, Export, Cost Tracking

**Goal:** Production-quality features: change detection, export, cost visibility, scheduled updates.

### Python Backend

| # | Task | Details |
|---|------|---------|
| 7.1 | Search delta detection | On re-search: flag new URLs, update `last_seen_at`, highlight disappeared results. |
| 7.2 | Scrape delta detection | On re-scrape: compare `content_hash`, flag changed content, mark downstream analyses as stale. |
| 7.3 | Cost tracking | Aggregate `token_usage` across all `source_analysis`, `research_synthesis`, `tag_consolidation`, `research_document` for a project. |
| 7.4 | Export service | Generate PDF, DOCX, structured JSON from `research_document`. |
| 7.5 | Scheduled re-search | Optional cron: re-search stale keywords on a schedule. |

### React Frontend

| # | Task | Details |
|---|------|---------|
| 7.6 | Delta indicators | "New since last search" badges. "Content changed" badges on sources. |
| 7.7 | Cost dashboard | Per-project LLM cost summary. Per-step breakdown. |
| 7.8 | Export buttons | Download as PDF/DOCX/JSON from document view. |
| 7.9 | Version comparison | Diff view between document versions or content versions. |

### Deliverable
Production-ready system with change detection, cost visibility, export, and optional automation.

---

## Phase Summary

| Phase | Focus | LLM Work | Python Tasks | React Tasks | Other |
|-------|-------|----------|-------------|-------------|-------|
| 1 | Foundation | None | 7 | 4 | — |
| 2 | Initial Pass | 4 agents | 5 | 4 | — |
| 3 | Curation | None | 4 | 4 | — |
| 4 | Templates | 5×3 agents | 3 | 2 | — |
| 5 | Tags & Docs | 3 agents | 5 | 4 | — |
| 6 | Multi-Source | None | 7 | 4 | 3 (extension) |
| 7 | Polish | None | 5 | 4 | — |

**Estimated total:** ~36 Python tasks, ~26 React tasks, ~22 agent definitions, 3 Chrome extension tasks.

---

## Critical Path

The minimum viable product is **Phases 1 + 2 + 3**:

1. **Phase 1** gives us: database, search, scrape, storage, basic UI.
2. **Phase 2** gives us: the "wow" moment — enter a topic, get a full research document.
3. **Phase 3** gives us: human curation — the research becomes actually useful because users can refine it.

After that, **Phase 4** (templates) is the highest-value next step because it transforms the system from generic to domain-expert. **Phase 5** (tagging) enables structured documents. **Phase 6** (multi-source) broadens the input types. **Phase 7** (polish) makes it production-ready.

---

## Notes

- **Phases are not strictly sequential.** Some Phase 3 work (curation UI) can happen in parallel with Phase 2 backend work.
- **Agent creation** (prompt builtins) can happen independently of backend/frontend work. The agents are configured in the platform UI.
- **The Chrome extension work** (Phase 6) is isolated and can be parallelized with other phases.
- **Each phase delivers a usable increment.** There's no phase that's purely "infrastructure" with no user-visible output.
