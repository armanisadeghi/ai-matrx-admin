# Frontend Migration Guide: Research System Routes

**Date:** 2026-02-18
**Breaking change:** Yes — all API routes and data models have changed.

---

## What Changed and Why

1. **`rs_config` renamed to `rs_topic`** — a project can now have many research topics (1:many)
2. **`project_id` removed from all topic-scoped routes** — `topic_id` is a UUID that uniquely identifies the row, `project_id` is derivable from it. No reason to pass both.
3. **RLS enabled** on all `rs_` tables — access chains through `project_id` → `projects` table policies.

### Data Model

```
Project (existing)
  └── rs_topic (was rs_config) — 1:many, each has its own name
       ├── rs_keyword
       ├── rs_source
       │    ├── rs_content
       │    ├── rs_analysis
       │    └── rs_media
       ├── rs_synthesis
       ├── rs_tag
       │    └── rs_tag_consolidation
       └── rs_document
```

## Suggested Proper Next.js Routes

/
└── research/
    ├── page.tsx                          # Marketing/landing (no auth)
    ├── layout.tsx                        # Shared layout (minimal, no auth guard)
    │
    └── topics/
        ├── page.tsx                      # Authenticated list of user's topics
        ├── new/
        │   └── page.tsx                  # Create new topic
        └── [topicId]/
            ├── layout.tsx                # Topic shell / sidebar nav
            ├── page.tsx                  # Topic dashboard / overview
            ├── sources/
            │   ├── page.tsx              # Sources list
            │   └── [sourceId]/
            │       └── page.tsx          # Single source detail
            ├── keywords/
            │   └── page.tsx              # Keywords + search results
            ├── content/
            │   └── page.tsx              # Scraped content viewer
            ├── analysis/
            │   └── page.tsx              # Analysis results
            ├── synthesis/
            │   └── page.tsx              # Synthesis outputs
            ├── documents/
            │   └── page.tsx              # Generated documents
            ├── media/
            │   └── page.tsx              # Media gallery
            ├── tags/
            │   ├── page.tsx              # Tags list
            │   └── [tagId]/
            │       └── page.tsx          # Tag detail + sources
            └── costs/
                └── page.tsx              # Token usage / costs

---

## New API Route Structure

Base: `{PYTHON_BACKEND_URL}/api/research`

### Static Routes (no IDs needed)

| Method | Path | Source | Description |
|--------|------|--------|-------------|
| GET | `/templates/list` | DB only | List all templates |
| POST | `/templates` | DB only | Create template |
| GET | `/templates/{template_id}` | DB only | Get single template |
| GET | `/extension/scrape-queue` | Python | Cross-project aggregation query |
| POST | `/suggest` | Python | LLM agent: keyword/title suggestions |

### Project-Scoped Routes (project_id needed)

Only two routes need `project_id` — creating and listing topics within a project:

| Method | Path | Source | Description |
|--------|------|--------|-------------|
| POST | `/projects/{project_id}/topics` | Python | Create topic (template application, project auto-create) |
| GET | `/projects/{project_id}/topics` | DB only | List all topics for a project |

### Topic-Scoped Routes (topic_id only)

Every other route uses **only `topic_id`**. The **Source** column tells you whether to call the Python API or query Supabase directly:

- **Python** = Must go through the API (scraping, search, agents, streaming, versioning logic)
- **DB only** = Simple CRUD — client can query Supabase directly instead of using the API

| Method | Path | Source | Description |
|--------|------|--------|-------------|
| GET | `/topics/{topic_id}` | Python | Get topic details + computed progress |
| PATCH | `/topics/{topic_id}` | DB only | Update topic settings |
| POST | `/topics/{topic_id}/keywords` | Python | Add keywords (validation + project_id resolution) |
| GET | `/topics/{topic_id}/keywords` | DB only | List keywords |
| DELETE | `/topics/{topic_id}/keywords/{keyword_id}` | DB only | Delete keyword |
| POST | `/topics/{topic_id}/search` | Python | Run Brave search (SSE stream) |
| POST | `/topics/{topic_id}/scrape` | Python | Run web scraping (SSE stream) |
| GET | `/topics/{topic_id}/sources` | DB only | List sources (filterable) |
| PATCH | `/topics/{topic_id}/sources/{source_id}` | DB only | Update source |
| PATCH | `/topics/{topic_id}/sources/bulk` | DB only | Bulk update sources |
| GET | `/topics/{topic_id}/sources/{source_id}/content` | DB only | Get content versions |
| PATCH | `/topics/{topic_id}/content/{content_id}` | Python | Edit content (versioning + hashing) |
| POST | `/topics/{topic_id}/sources/{source_id}/content` | Python | Paste content (versioning + hashing) |
| POST | `/topics/{topic_id}/sources/{source_id}/analyze` | Python | LLM agent: analyze single source |
| POST | `/topics/{topic_id}/analyze-all` | Python | LLM agent: bulk analyze (SSE stream) |
| POST | `/topics/{topic_id}/synthesize` | Python | LLM agent: synthesize (SSE stream) |
| GET | `/topics/{topic_id}/synthesis` | DB only | Get current synthesis |
| POST | `/topics/{topic_id}/run` | Python | Full pipeline orchestration (SSE stream) |
| GET | `/topics/{topic_id}/tags` | DB only | List tags |
| POST | `/topics/{topic_id}/tags` | DB only | Create tag |
| PATCH | `/topics/{topic_id}/tags/{tag_id}` | DB only | Update tag |
| DELETE | `/topics/{topic_id}/tags/{tag_id}` | DB only | Delete tag |
| POST | `/topics/{topic_id}/sources/{source_id}/tags` | DB only | Assign tags to source |
| POST | `/topics/{topic_id}/tags/{tag_id}/consolidate` | Python | LLM agent: consolidate tag |
| POST | `/topics/{topic_id}/sources/{source_id}/suggest-tags` | Python | LLM agent: auto-suggest tags |
| POST | `/topics/{topic_id}/document` | Python | LLM agent: generate document |
| GET | `/topics/{topic_id}/document` | DB only | Get latest document |
| GET | `/topics/{topic_id}/document/versions` | DB only | Get all document versions |
| GET | `/topics/{topic_id}/links` | Python | Aggregation across content rows |
| POST | `/topics/{topic_id}/links/add-to-scope` | Python | Business logic: creates source rows |
| GET | `/topics/{topic_id}/media` | DB only | Get media items |
| PATCH | `/topics/{topic_id}/media/{media_id}` | DB only | Update media |
| POST | `/topics/{topic_id}/sources/{source_id}/transcribe` | Python | Transcription pipeline |
| POST | `/topics/{topic_id}/sources/upload` | Python | File upload (not yet implemented) |
| POST | `/topics/{topic_id}/sources/{source_id}/extension-content` | Python | HTML parsing + content storage |
| GET | `/topics/{topic_id}/costs` | Python | Multi-table aggregation |
| GET | `/topics/{topic_id}/document/export` | DB only | Export document (reads row) |

---

## Request Body Changes

### Create Topic (was "Init Research")

**Old:** `POST /api/research/init`

**New:** `POST /api/research/projects/{project_id}/topics`
```json
{
  "name": "All Green Brand Profile",
  "autonomy_level": "semi",
  "template_id": "uuid | null",
  "subject_name": "All Green Electronics"
}
```

Key differences:
- `project_id` is in the URL path, not the body
- New required field: `name` — the display name for this research topic
- `subject_name` is optional — used for template variable substitution and agent context
- `created_by` is auto-populated from the auth token (do not send)

### Topic Response (was "ResearchConfigResponse")

```json
{
  "id": "topic-uuid",
  "project_id": "project-uuid",
  "name": "All Green Brand Profile",
  "autonomy_level": "semi",
  "status": "draft",
  "progress": { ... },
  ...
}
```

### Keyword Response

New field `topic_id`:
```json
{
  "id": "keyword-uuid",
  "topic_id": "topic-uuid",
  "project_id": "project-uuid",
  "keyword": "All Green Electronics",
  ...
}
```

---

## Frontend Flow Changes

### 1. Topic List Page (NEW)

When a user navigates to a project's research section, show all topics:

```
GET /api/research/projects/{project_id}/topics
→ [{ id, name, status, created_at, progress: {...} }, ...]
```

Each card/row shows: topic name, status badge, progress summary, created date.

### 2. Creating a Topic

1. User selects a project (or creates one)
2. User sees a list of research topics for that project
3. User clicks "New Research Topic" → enters a **name** + optional template
4. Sends `POST /api/research/projects/{project_id}/topics`
5. Receives topic response with `id`
6. Redirected to topic detail view

### 3. All Topic Operations

Once inside a topic, **only `topic_id` is needed**. The frontend should store `topicId` in context/URL params. No `projectId` required for any topic-scoped operation.

### 4. Extension Scrape Queue

The response includes `topic_id` and `topic_name` alongside `project_id` and `project_name`.

### 5. Suggest Endpoint

Top-level at `/suggest` — no project or topic context needed. Called before creation.

---

## Migration Checklist

- [ ] Update all API client functions — topic-scoped routes no longer have `project_id`
- [ ] Only pass `project_id` for `POST/GET /projects/{project_id}/topics`
- [ ] Create new "Topic List" page for each project
- [ ] Update "Create Research" flow to `POST /projects/{project_id}/topics`
- [ ] Store only `topicId` in route params for all topic-scoped views
- [ ] Update TypeScript types: `ResearchConfig` → `Topic`, add `name` and `topic_id` fields
- [ ] Update extension scrape queue to handle `topic_id`/`topic_name`
- [ ] Test all SSE streaming endpoints with new URL structure
