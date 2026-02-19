# Research System — Frontend Specification

Complete specification for the React/TypeScript team. All API endpoints are prefixed with `/api/research` (the base URL is the Python backend, not Next.js).

---

## Authentication

All endpoints require `Authorization: Bearer <supabase_jwt>`. The middleware handles auth — no special headers beyond the standard Supabase token.

---

## API Base URL

```
{PYTHON_BACKEND_URL}/api/research
```

---

## Table of Contents

1. [Research Init Flow](#1-research-init-flow)
2. [Research Overview Page](#2-research-overview-page)
3. [Source List View](#3-source-list-view)
4. [Source Detail / Content Review](#4-source-detail--content-review)
5. [Curation UI](#5-curation-ui)
6. [Template Picker](#6-template-picker)
7. [Research Document Viewer](#7-research-document-viewer)
8. [Analysis Cards](#8-analysis-cards)
9. [Iteration UI](#9-iteration-ui)
10. [Tag Management](#10-tag-management)
11. [Consolidation View](#11-consolidation-view)
12. [Document Assembly View](#12-document-assembly-view)
13. [Link Explorer](#13-link-explorer)
14. [Media Gallery](#14-media-gallery)
15. [YouTube Source Cards](#15-youtube-source-cards)
16. [File Upload](#16-file-upload)
17. [Chrome Extension — Scrape Queue](#17-chrome-extension--scrape-queue)
18. [SSE Streaming Integration](#18-sse-streaming-integration)
19. [Delta Indicators](#19-delta-indicators)
20. [Cost Dashboard](#20-cost-dashboard)
21. [Export](#21-export)
22. [Version Comparison](#22-version-comparison)

---

## 1. Research Init Flow

### Route
`/projects/{project_id}/research/new`

### UX Flow
1. User navigates to a project and clicks "Start Research"
2. **Step 1 — Subject:** Text input for the research subject name (e.g., "All Green Electronics")
3. **Step 2 — Template (optional):** Card-based template picker (see [Section 6](#6-template-picker))
4. **Step 3 — LLM Suggestions:** After entering subject name, call `POST /research/{project_id}/suggest` with `{subject_name}`. Display:
   - Suggested title (editable)
   - Suggested description (editable)
   - Suggested keywords as checkboxes (user picks 2+)
   - Optional initial insights text
5. **Step 4 — Autonomy Level:** Radio group: Auto / Semi-Auto / Manual
6. **Submit:** Calls:
   - `POST /research/init` with `{project_id, autonomy_level, template_id?, subject_name}`
   - `POST /research/{project_id}/keywords` with selected keywords
   - If autonomy is "auto": immediately redirect to overview and trigger `POST /research/{project_id}/run`

### API Calls
| Action | Method | Endpoint | Body |
|--------|--------|----------|------|
| Suggest setup | POST | `/research/{project_id}/suggest` | `{subject_name}` |
| Init research | POST | `/research/init` | `{project_id, autonomy_level, template_id?, subject_name?}` |
| Add keywords | POST | `/research/{project_id}/keywords` | `{keywords: [str]}` |
| Run pipeline | POST | `/research/{project_id}/run` | `{}` |

### Components
- `ResearchInitForm` — wizard-style multi-step form
- `SubjectNameInput` — text input with validation
- `TemplatePicker` — card grid (reusable)
- `KeywordSuggester` — checkbox list from LLM
- `AutonomySelector` — radio group with descriptions

---

## 2. Research Overview Page

### Route
`/projects/{project_id}/research`

### Data Source
`GET /research/{project_id}` — returns config + `progress` object with computed stats.

### Layout
Dashboard-style grid of cards showing pipeline progress. The `status` field is cosmetic — real state comes from the `progress` object.

### Cards

| Card | Data Fields | Visual |
|------|------------|--------|
| **Keywords** | `progress.total_keywords`, `progress.stale_keywords` | Count + "X stale" badge |
| **Sources** | `progress.total_sources`, `progress.included_sources`, per-status counts | Stacked horizontal bar (pending=gray, success=green, thin=yellow, failed=red, complete=blue) |
| **Content** | `progress.total_content` | Count |
| **Analyses** | `progress.total_analyses` vs total eligible | "X / Y analyzed" with progress ring |
| **Keyword Syntheses** | `progress.keyword_syntheses` vs `total_keywords` | "X / Y synthesized" |
| **Research Report** | `progress.project_syntheses` | "Generated" / "Not yet" badge |
| **Tags** | `progress.total_tags` | Count |
| **Documents** | `progress.total_documents` | Version number badge |

### Action Buttons (top bar)
- **"Run Research"** — triggers `POST /research/{project_id}/run` (streaming, see [Section 18](#18-sse-streaming-integration))
- **"Search"** — triggers `POST /research/{project_id}/search` (streaming)
- **"Scrape"** — triggers `POST /research/{project_id}/scrape` (streaming)
- **"Analyze All"** — triggers `POST /research/{project_id}/analyze-all` (streaming)
- **"Generate Report"** — triggers `POST /research/{project_id}/synthesize` with `{scope: "project", iteration_mode: "initial"}`

### Refresh
Poll `GET /research/{project_id}` every 5 seconds during active operations, or after SSE stream ends.

---

## 3. Source List View

### Route
`/projects/{project_id}/research/sources`

### Data Source
`GET /research/{project_id}/sources?keyword_id=&scrape_status=&source_type=&hostname=&is_included=&origin=&limit=100&offset=0`

### Table Columns

| Column | Source Field | Render |
|--------|-------------|--------|
| Include | `is_included` | Toggle switch |
| Title | `title` | Text, clickable → source detail page |
| Hostname | `hostname` | Badge/chip |
| Rank | `rank` | Number |
| Type | `source_type` | Icon (globe=web, play=youtube, file=pdf, upload=file, pencil=manual) |
| Origin | `origin` | Small badge (search, manual, link, file) |
| Scrape Status | `scrape_status` | Color-coded badge: pending=gray, success=green, thin=yellow, failed=red, complete=blue, manual=purple |
| Keywords | computed from keyword_source join | Number badge "Found by X keywords" |

### Filters (top bar)
- Keyword dropdown (from `GET /research/{project_id}/keywords`)
- Status dropdown (all statuses)
- Source type dropdown
- Hostname dropdown (dynamically populated from distinct hostnames)
- Is included toggle
- Origin dropdown

### Pagination
Standard offset-based with limit selector (25, 50, 100).

### Bulk Actions
Checkbox column on left. When 1+ selected, show floating action bar:
- "Exclude Selected" → `PATCH /research/{project_id}/sources/bulk` `{source_ids, action: "exclude"}`
- "Include Selected" → `{action: "include"}`
- "Mark Stale" → `{action: "mark_stale"}`
- "Mark Complete" → `{action: "mark_complete"}`
- "Scrape Selected" — future: trigger scrape for specific sources

### Row Actions
Each row has a 3-dot menu:
- View Content → navigate to source detail
- Toggle Include/Exclude
- Re-scrape
- Mark as Complete
- Mark as Stale

---

## 4. Source Detail / Content Review

### Route
`/projects/{project_id}/research/sources/{source_id}`

### Data Sources
- Source metadata: from the source list data or `GET /research/{project_id}/sources?` filtered
- Content versions: `GET /research/{project_id}/sources/{source_id}/content`
- Analysis: appears in analysis section

### Layout
Two-panel layout:
- **Left Panel (30%):** Source metadata
  - URL (clickable, opens in new tab)
  - Title
  - Hostname
  - Source type icon
  - Origin badge
  - Scrape status badge
  - Discovered at / Last seen at dates
  - Quality override dropdown
  - Version history dropdown (select from content versions)
  - **Action buttons:** "Re-scrape", "Mark Complete", "Mark Stale", "Paste Content"

- **Right Panel (70%):** Content viewer
  - Full text content of the selected version
  - Edit mode toggle → switches to textarea, "Save" button creates new version via `PATCH /research/{project_id}/content/{content_id}`
  - Character count display
  - Content version indicator: "Version 3 of 3" with arrows to navigate

### Paste Content Modal
Triggered by "Paste Content" button:
- Large textarea
- Content type dropdown (plain_text, html, markdown)
- Submit → `POST /research/{project_id}/sources/{source_id}/content` with `{content, content_type}`

### Analysis Section (below content)
Expandable card showing analysis results. See [Section 8](#8-analysis-cards).

---

## 5. Curation UI

Curation features are integrated into the Source List and Source Detail views:

### Source List Enhancements
- **Toggle switches:** per-row for include/exclude, calls `PATCH /research/{project_id}/sources/{source_id}` with `{is_included: true/false}`
- **Visual distinction:** Excluded sources are greyed out (opacity: 0.5)
- **Bulk action bar:** Appears when checkboxes selected
- **"Exclude All from [hostname]":** Right-click context menu option, filters by hostname and bulk excludes

### Content Review Enhancements
- **Edit button:** Switches content display to editable textarea
- **"Save" button:** Creates new content version: `PATCH /research/{project_id}/content/{content_id}` with `{content}`
- **"Re-scrape" button:** Resets source to pending, triggers scrape
- **Status override buttons:**
  - "Mark as Complete" → sets `scrape_status: "complete"` (thin content is acceptable)
  - "Re-scrape" → sets `scrape_status: "pending"`
  - "Mark Stale" → sets `is_stale: true`

---

## 6. Template Picker

### Used In
Research Init Flow (Step 2).

### Data Source
`GET /research/templates/list`

### Layout
Grid of cards (3-4 per row on desktop). Each card:
- Template name (large)
- Description (2 lines max)
- Keyword pattern preview: first 3 keywords with `{name}` highlighted
- Tag count: "6 default tags"
- Autonomy badge
- "No Template" card as first option (plain, dashed border)

### Template Preview Modal
Clicking "Preview" on a card opens a modal:
- Full description
- Keyword patterns (with `{name}` replaced by the entered subject name, if available)
- All default tags listed
- Agent configuration info (which specialized agents, if any)
- "Use This Template" button

### API
- List: `GET /research/templates/list`
- Detail: `GET /research/templates/{id}`
- Create (user): `POST /research/templates`

---

## 7. Research Document Viewer

### Route
`/projects/{project_id}/research/document`

### Data Source
- Current document: `GET /research/{project_id}/document`
- Current synthesis: `GET /research/{project_id}/synthesis?scope=project`

### Layout
Full-width markdown renderer:
- **Header:** Document title, version badge, "Generated at" timestamp
- **Toolbar:** "Regenerate", "Export" dropdown, "Version History" button
- **Body:** Rendered markdown content (read-only in initial implementation)
- **Footer:** Token usage / cost info

### Version History
Sidebar or modal listing all document versions from `GET /research/{project_id}/document/versions`. Click a version to view it. "Compare" button opens diff view (see [Section 22](#22-version-comparison)).

---

## 8. Analysis Cards

### Used In
Source Detail page, below the content panel.

### Data Source
Included in content endpoint response, or query `GET /research/{project_id}/sources/{source_id}/content` and cross-reference with analyses.

### Layout
Expandable card per analysis:
- **Collapsed:** Agent type badge, model name, first 2 lines of result, timestamp
- **Expanded:** Full analysis result (markdown rendered), token usage, agent ID reference
- **"Analyze" button:** Visible when no analysis exists for the current content version. Calls `POST /research/{project_id}/sources/{source_id}/analyze` with `{agent_type: "page_summary"}`
- **"Re-analyze" button:** Runs analysis again on current content

---

## 9. Iteration UI

### Used In
Research Overview page, after initial pass is complete.

### Layout
Action buttons section on the Overview page:
- **"Add Keywords"** → Opens keyword input modal, adds via `POST /research/{project_id}/keywords`
- **"Re-run (Rebuild)"** → Calls `POST /research/{project_id}/synthesize` with `{scope: "project", iteration_mode: "rebuild"}`. Streams progress.
- **"Re-run (Update)"** → Calls `POST /research/{project_id}/synthesize` with `{scope: "project", iteration_mode: "update"}`. Streams progress.

### Tooltip Descriptions
- **Rebuild:** "Fresh synthesis using current included sources. Reuses existing per-page analyses. Best when you've made significant changes to which sources are included."
- **Update:** "Agent updates the existing report with new and changed information. Best for adding a few new sources or keywords without starting over."

### Keyword-Level Iteration
On a per-keyword view (if implemented), same buttons but with `scope: "keyword"` and `keyword_id`.

---

## 10. Tag Management

### Route
`/projects/{project_id}/research/tags`

### Data Source
`GET /research/{project_id}/tags`

### Layout
- **Tag List:** Vertical list with drag-and-drop reordering (update `sort_order` via `PATCH`)
- **Each Tag Row:** Name, description, source count, color indicator, edit/delete buttons
- **"Add Tag" button:** Inline form or modal with name + description fields
- **Edit:** Inline editing or modal
- **Delete:** Confirmation dialog, calls `DELETE /research/{project_id}/tags/{tag_id}`

### Source-Tag Assignment
Two approaches (implement the one that fits your UI best):

**Option A — Tag Chips on Source List:**
Each source row shows assigned tags as chips. Click "+" to open tag assignment popover. Select/deselect tags. Star icon marks primary source.

**Option B — Tag Matrix:**
Grid view: sources as rows, tags as columns. Checkbox at intersections. Star for primary source. Best for bulk assignment.

API: `POST /research/{project_id}/sources/{source_id}/tags` with `{tag_ids: [...], is_primary_source: false}`

### Auto-Tag Suggestions
On Source Detail page, "Suggest Tags" button calls `POST /research/{project_id}/sources/{source_id}/suggest-tags`. Shows suggestions with:
- Tag name
- Confidence score (percentage bar)
- Reason text
- One-click "Accept" button per suggestion

---

## 11. Consolidation View

### Route
`/projects/{project_id}/research/tags/{tag_id}`

### Data Source
Tag consolidation result is retrieved when the tag is consolidated.

### Layout
- **Header:** Tag name, description, source count
- **Consolidated Content:** Markdown-rendered consolidation result
- **Source Citations:** Listed below with links to source detail
- **"Re-consolidate" button:** Calls `POST /research/{project_id}/tags/{tag_id}/consolidate`
- **Consolidation History:** Version dropdown (if multiple consolidations exist)

---

## 12. Document Assembly View

### Route
Same as [Section 7](#7-research-document-viewer) but with assembly-specific controls.

### Additional Features
- **"Generate Document" button:** Calls `POST /research/{project_id}/document`. Only available when tag consolidations exist.
- **Section navigation sidebar:** TOC-style links to document sections (parsed from markdown headers)
- **"Regenerate Section" buttons:** Per-section (future — requires section-level editing)
- **"Regenerate All" button:** Creates new document version

---

## 13. Link Explorer

### Route
`/projects/{project_id}/research/links`

### Data Source
`GET /research/{project_id}/links`

### Layout
Table of extracted links grouped by source page:
| Column | Description |
|--------|-------------|
| URL | The extracted link |
| Link Text | Anchor text from the page |
| Found On | Source page title/URL that contained this link |
| Actions | "Add to Scope" button |

### Features
- **Filters:** Domain filter, source page filter
- **Deduplication:** URLs already in research scope are excluded by the API
- **"Add to Scope" button:** Per-link or bulk select + "Add Selected". Calls `POST /research/{project_id}/links/add-to-scope` with `{urls: [...]}`
- After adding, new sources appear in the Source List with `origin: "link_extraction"` and `scrape_status: "pending"`

---

## 14. Media Gallery

### Route
`/projects/{project_id}/research/media`

### Data Source
`GET /research/{project_id}/media?media_type=&is_relevant=`

### Layout
Grid of media cards:
- **Image cards:** Thumbnail (load `url` directly), alt text below, source attribution
- **Video cards:** Thumbnail or play icon, source URL
- **Toggle:** "Relevant" / "Not Relevant" per item → `PATCH /research/{project_id}/media/{media_id}` with `{is_relevant: true/false}`
- **Filters:** Media type dropdown, relevance filter

---

## 15. YouTube Source Cards

### Used In
Source List view, for sources where `source_type === "youtube"`.

### Visual
- Video thumbnail (from `thumbnail_url`)
- Play icon overlay
- "Transcribe" button (calls `POST /research/{project_id}/sources/{source_id}/transcribe`)
- After transcription: expandable transcript viewer showing the content

### Status Flow
1. Initial: Source appears with `source_type: "youtube"`, `scrape_status: "pending"`
2. User clicks "Transcribe" → status message shown: "Queued for transcription"
3. After transcription completes (manual process): content appears, scrape_status updates

---

## 16. File Upload

### Used In
Sources page, as a "Upload File" button or drag-and-drop zone.

### Supported Formats
PDF, DOC/DOCX, TXT, MD

### Flow
1. User drops files or clicks upload
2. `POST /research/{project_id}/sources/upload` (multipart/form-data) — **Note:** This endpoint is placeholder (501) until multipart support is added
3. Creates new `rs_source` with `origin: "file_upload"` + `rs_content` with extracted text

### UI
- Drag-and-drop zone styled consistently with the rest of the app
- File type icons
- Upload progress indicator
- Success: source appears in list

---

## 17. Chrome Extension — Scrape Queue

### New Tab in Existing Extension
Add a "Research" tab to the Chrome extension.

### Data Source
`GET /research/extension/scrape-queue` — returns all sources with `scrape_status IN ('failed', 'thin') AND is_included = true` across the user's projects.

### Layout
List grouped by project:
```
📁 All Green Electronics Research
  ⚠ allgreenelectronics.com/about — Failed
  ⚠ bbb.org/profile/all-green — Thin (450 chars)
  
📁 Cardiac Surgery Research  
  ⚠ nejm.org/advances-2026 — Failed
```

Each item shows: title, URL, status badge, project name.

### One-Click Capture
When the user navigates to a URL that's in the scrape queue:
1. Extension detects the URL match
2. Shows highlighted "Capture for Research" button in the extension popup
3. On click: captures full page HTML
4. Calls `POST /research/{project_id}/sources/{source_id}/extension-content` with `{html_content}`
5. Shows success/failure notification
6. Removes from queue

### Status Sync
After capture, the web UI should reflect the updated source status on next poll or page refresh.

---

## 18. SSE Streaming Integration

### Streaming Endpoints
These endpoints return NDJSON streams (`application/x-ndjson`):

| Endpoint | Events |
|----------|--------|
| `POST /research/{project_id}/search` | `status_update` with search progress |
| `POST /research/{project_id}/scrape` | `status_update` with scrape progress |
| `POST /research/{project_id}/analyze-all` | `status_update` with analysis progress |
| `POST /research/{project_id}/synthesize` | `status_update` with synthesis progress |
| `POST /research/{project_id}/run` | All of the above in sequence |

### Event Format
Each line is a JSON object:
```json
{"event": "status_update", "data": {"status": "searching", "user_message": "Found 45 results for \"keyword\"..."}}
{"event": "data", "data": {"event": "search_complete", "total_sources": 87}}
{"event": "end", "data": {"reason": "complete"}}
```

### Frontend Integration Pattern
```typescript
const response = await fetch(`${API_URL}/research/${projectId}/run`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const lines = decoder.decode(value).split('\n').filter(Boolean);
  for (const line of lines) {
    const event = JSON.parse(line);
    
    switch (event.event) {
      case 'status_update':
        updateProgressUI(event.data.status, event.data.user_message);
        break;
      case 'data':
        handleDataEvent(event.data);
        break;
      case 'error':
        showError(event.data.user_message);
        break;
      case 'end':
        refreshResearchState();
        break;
    }
  }
}
```

### Progress UI Component
A `ResearchProgressPanel` component that:
- Shows a log of status messages as they stream in
- Displays a spinner for active operations
- Shows step indicators (Search → Scrape → Analyze → Synthesize → Report)
- Highlights the current active step
- Shows completion when stream ends

---

## 19. Delta Indicators

### Used In
Source List view, after a re-search or re-scrape.

### Visual Indicators
- **"New" badge:** Green badge on sources where `discovered_at` is after the previous search timestamp. Applied to sources that appeared in the latest search but weren't there before.
- **"Changed" badge:** Orange badge on sources whose content hash changed on re-scrape. The previous and current content hash can be compared from the content versions endpoint.
- **"Stale" indicator:** Yellow dot on keywords or sources marked as stale.

### Implementation
Compare `discovered_at` timestamps against the keyword's `last_searched_at` from the previous search run. For content changes, compare `content_hash` across versions.

---

## 20. Cost Dashboard

### Used In
Research Overview page, as an expandable card.

### Data Source
`GET /research/{project_id}/costs`

### Layout
Card showing:
- **Total estimated cost:** Large number with dollar sign
- **Total LLM calls:** Number
- **Expandable breakdown table:**

| Category | Calls | Input Tokens | Output Tokens | Est. Cost |
|----------|-------|-------------|---------------|-----------|
| Per-Page Analyses (Tier A) | 10 | 45,000 | 8,000 | $0.012 |
| Keyword Syntheses (Tier B) | 2 | 12,000 | 4,000 | $0.008 |
| Project Synthesis (Tier C) | 1 | 25,000 | 6,000 | $0.015 |
| Tag Consolidations | 5 | 18,000 | 5,000 | $0.010 |
| Document Assembly | 1 | 20,000 | 8,000 | $0.018 |
| **Total** | **19** | **120,000** | **31,000** | **$0.063** |

---

## 21. Export

### Used In
Document Viewer toolbar.

### Buttons
- "Export as JSON" → `GET /research/{project_id}/document/export?format=json` → triggers download
- "Export as PDF" → `format=pdf` (future)
- "Export as DOCX" → `format=docx` (future)

### Implementation
JSON export is available immediately. PDF and DOCX will require server-side rendering libraries (future phase).

---

## 22. Version Comparison

### Used In
Content Review page (content versions) and Document Viewer (document versions).

### Flow
1. User selects two versions from dropdown(s)
2. Side-by-side diff display
3. Additions highlighted in green, removals in red

### Data
- Content versions: `GET /research/{project_id}/sources/{source_id}/content` returns all versions
- Document versions: `GET /research/{project_id}/document/versions`

### Implementation
Use a client-side diff library (e.g., `diff`, `jsdiff`, or `react-diff-viewer-continued`) to generate the visual diff.

---

## Component Summary

| Component | Route / Location | Primary API |
|-----------|-----------------|-------------|
| `ResearchInitForm` | `/research/new` | `POST /init`, `POST /keywords`, `POST /suggest` |
| `ResearchOverview` | `/research` | `GET /{project_id}` |
| `SourceList` | `/research/sources` | `GET /{project_id}/sources` |
| `SourceDetail` | `/research/sources/{id}` | `GET /{project_id}/sources/{id}/content` |
| `TemplatePicker` | Init flow | `GET /templates/list` |
| `DocumentViewer` | `/research/document` | `GET /{project_id}/document` |
| `TagManager` | `/research/tags` | `GET/POST/PATCH/DELETE /{project_id}/tags` |
| `ConsolidationView` | `/research/tags/{id}` | `POST /{project_id}/tags/{id}/consolidate` |
| `LinkExplorer` | `/research/links` | `GET /{project_id}/links` |
| `MediaGallery` | `/research/media` | `GET /{project_id}/media` |
| `CostDashboard` | Overview card | `GET /{project_id}/costs` |
| `ProgressPanel` | Overlay during ops | SSE streams |
| `VersionDiff` | Content/Doc views | Compare two versions |
| `ExtensionScrapeQueue` | Chrome extension | `GET /extension/scrape-queue` |

---

## Data Flow Diagrams

### Init → First Research Run
```
User enters subject → POST /suggest → Show suggestions
User picks keywords → POST /init → POST /keywords
User clicks "Run" → POST /run (SSE stream):
  → Search all keywords (stores rs_source, rs_keyword_source)
  → Scrape top sources (stores rs_content, rs_media)
  → Analyze pages (stores rs_analysis)
  → Keyword synthesis (stores rs_synthesis scope=keyword)
  → Full report (stores rs_synthesis scope=project)
  → Stream "complete"
Frontend: refresh overview, show document
```

### Iteration Cycle
```
User reviews sources → toggles, edits, adds keywords
User clicks "Re-run (Rebuild)" → POST /synthesize {scope: project, iteration_mode: rebuild}
  → Reuses existing page analyses for unchanged content
  → Generates fresh keyword syntheses
  → Generates fresh project report
  → Stream "complete"

OR

User clicks "Re-run (Update)" → POST /synthesize {scope: project, iteration_mode: update}
  → Agent receives previous report + delta
  → Produces updated report
  → Stream "complete"
```

### Tag Consolidation → Document
```
User creates tags → POST /tags
User assigns sources to tags → POST /sources/{id}/tags
User consolidates per tag → POST /tags/{id}/consolidate
  → Each tag produces a consolidated section
User generates document → POST /document
  → Agent assembles all tag consolidations into final document
```

## 23. Resources:

# Research System — Database (Current Structure)

All research tables use the `rs_` prefix and live in the `public` schema.

---

## Table Overview

```
rs_config              (1:1 with project — research settings & state)
  │
  ├── rs_keyword       (keywords for this research)
  │     └── rs_keyword_source  (join: which keywords found which URLs)
  │
  ├── rs_source        (individual URLs / content sources)
  │     ├── rs_content         (scraped/captured content — versioned)
  │     │     └── rs_analysis   (per-page LLM analysis)
  │     └── rs_media           (images, videos, documents)
  │
  ├── rs_synthesis     (per-keyword or project-level LLM synthesis)
  │
  ├── rs_tag           (tags for categorizing information)
  │     ├── rs_source_tag      (join: sources ↔ tags)
  │     └── rs_tag_consolidation (LLM consolidation per tag)
  │
  ├── rs_template      (reusable templates; referenced by rs_config)
  └── rs_document      (final assembled document — versioned)
```

---

## Table Definitions (Current Schema)

### rs_config

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| autonomy_level | text |
| default_search_provider | text |
| default_search_params | jsonb |
| good_scrape_threshold | integer |
| scrapes_per_keyword | integer |
| status | text |
| template_id | uuid FK → rs_template |
| agent_config | jsonb |
| metadata | jsonb |
| created_at | timestamptz |
| updated_at | timestamptz |

---

### rs_keyword

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| keyword | text |
| search_provider | text |
| search_params | jsonb |
| last_searched_at | timestamptz |
| is_stale | boolean |
| result_count | integer |
| raw_api_response | jsonb |
| created_at | timestamptz |

---

### rs_source

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| url | text |
| title | text |
| description | text |
| hostname | text |
| source_type | text |
| origin | text |
| rank | integer |
| page_age | text |
| thumbnail_url | text |
| extra_snippets | text[] |
| raw_search_result | jsonb |
| is_included | boolean |
| is_stale | boolean |
| scrape_status | text |
| discovered_at | timestamptz |
| last_seen_at | timestamptz |

---

### rs_keyword_source

| Column | Type |
|--------|------|
| id | uuid PK |
| keyword_id | uuid FK → rs_keyword |
| source_id | uuid FK → rs_source |
| rank_for_keyword | integer |
| created_at | timestamptz |

---

### rs_content

| Column | Type |
|--------|------|
| id | uuid PK |
| source_id | uuid FK → rs_source |
| project_id | uuid FK → projects |
| content | text |
| content_hash | text |
| char_count | integer |
| content_type | text |
| is_good_scrape | boolean |
| quality_override | text |
| capture_method | text |
| failure_reason | text |
| published_at | timestamptz |
| modified_at | timestamptz |
| is_current | boolean |
| version | integer |
| linked_extraction_id | bigint |
| linked_transcript_id | uuid |
| extracted_links | jsonb |
| extracted_images | jsonb |
| scraped_at | timestamptz |

---

### rs_media

| Column | Type |
|--------|------|
| id | uuid PK |
| source_id | uuid FK → rs_source |
| project_id | uuid FK → projects |
| media_type | text |
| url | text |
| alt_text | text |
| caption | text |
| thumbnail_url | text |
| width | integer |
| height | integer |
| is_relevant | boolean |
| metadata | jsonb |
| created_at | timestamptz |

---

### rs_analysis

| Column | Type |
|--------|------|
| id | uuid PK |
| content_id | uuid FK → rs_content |
| source_id | uuid FK → rs_source |
| project_id | uuid FK → projects |
| agent_type | text |
| agent_id | uuid |
| model_id | text |
| instructions | text |
| result | text |
| result_structured | jsonb |
| token_usage | jsonb |
| created_at | timestamptz |

---

### rs_synthesis

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| keyword_id | uuid FK → rs_keyword |
| scope | text |
| agent_type | text |
| agent_id | uuid |
| model_id | text |
| instructions | text |
| result | text |
| result_structured | jsonb |
| input_source_ids | uuid[] |
| input_analysis_ids | uuid[] |
| token_usage | jsonb |
| is_current | boolean |
| version | integer |
| iteration_mode | text |
| previous_synthesis_id | uuid FK → rs_synthesis |
| created_at | timestamptz |

---

### rs_tag

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| name | text |
| description | text |
| sort_order | integer |
| created_at | timestamptz |

---

### rs_source_tag

| Column | Type |
|--------|------|
| id | uuid PK |
| source_id | uuid FK → rs_source |
| tag_id | uuid FK → rs_tag |
| is_primary_source | boolean |
| confidence | double precision |
| assigned_by | text |
| created_at | timestamptz |

---

### rs_tag_consolidation

| Column | Type |
|--------|------|
| id | uuid PK |
| tag_id | uuid FK → rs_tag |
| project_id | uuid FK → projects |
| agent_type | text |
| agent_id | uuid |
| model_id | text |
| result | text |
| result_structured | jsonb |
| source_content_ids | uuid[] |
| token_usage | jsonb |
| is_current | boolean |
| version | integer |
| created_at | timestamptz |

---

### rs_template

| Column | Type |
|--------|------|
| id | uuid PK |
| name | text |
| description | text |
| is_system | boolean |
| created_by | uuid |
| keyword_templates | jsonb |
| default_tags | jsonb |
| default_search_params | jsonb |
| agent_config | jsonb |
| autonomy_level | text |
| metadata | jsonb |
| created_at | timestamptz |

---

### rs_document

| Column | Type |
|--------|------|
| id | uuid PK |
| project_id | uuid FK → projects |
| title | text |
| content | text |
| content_structured | jsonb |
| source_consolidation_ids | uuid[] |
| agent_type | text |
| agent_id | uuid |
| model_id | text |
| token_usage | jsonb |
| version | integer |
| created_at | timestamptz |

---

## Name Mapping (Proposal → Current)

| Proposal name | Current table |
|---------------|----------------|
| research_config | rs_config |
| research_keyword | rs_keyword |
| research_source | rs_source |
| keyword_result_link | rs_keyword_source |
| research_source_content | rs_content |
| source_media | rs_media |
| source_analysis | rs_analysis |
| research_synthesis | rs_synthesis |
| research_tag | rs_tag |
| source_tag | rs_source_tag |
| tag_consolidation | rs_tag_consolidation |
| research_template | rs_template |
| research_document | rs_document |
