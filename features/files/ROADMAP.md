# Cloud-files roadmap

Tracker for the in-flight UX expansion. Items are grouped by phase; each
phase ships independently. Update this when a phase lands or when scope
shifts.

---

## Recently shipped

- **2026-04-28** — PDF viewer overhaul: ResizeObserver-driven fit-width,
  zoom in/out (¼ steps, capped 25 %–400 %), Actual Size at 1.5×, page
  rotation, page navigation. Replaces the silent "scale = 1.0" render
  that cut off landscape pages and never let users zoom.
- **2026-04-28** — `KindFilter` segmented control (Files / Folders / Both)
  in the filter row. Backed by a new `cloudFiles.ui.kindFilter` Redux
  field plumbed through `buildRows`.
- **2026-04-28** — Per-column dropdown headers (`ColumnHeader`) on the
  desktop file table — Name, Last modified, Size, Access. Each column
  exposes its own sort options + filter UI. Filters live on
  `cloudFiles.ui.columnFilters` and a sticky chip row above the table
  shows what's active with one-click dismissal.

---

## Next up — UX surfaces

### 1. Detail-columns toggle (Compact / Extended)

The slice already has `cloudFiles.ui.detailsLevel = "compact" | "extended"`
plus a `setDetailsLevel` reducer; just not wired into the table yet.

**Plan:**
- Add an `Extended` toggle next to `KindFilter` in `ContentHeader`.
- When `extended`, render two extra columns in `FileTable` and matching
  fields in `FileTableRow`:
  - **Extension** — derived from `fileName`. Folders show `—`.
  - **Type** — short MIME-derived label (`PDF`, `Image · PNG`,
    `Code · TS`, etc.). Drives a smarter icon if the file's mime type
    isn't recognized by `FileIcon`.
- Persist preference per user (Redux + cookie or
  `userPreferences` slice).

**Why now:** the user explicitly asked for visible file details. Cheap
to ship; pairs naturally with the column-filter row that just landed.

### 2. Power search/filter panel

The column-header dropdowns cover the common case. A multi-criteria
search panel (Cmd+F or a dedicated icon) covers the harder one.

**Plan:**
- New surface mounted from a "Search +" button in the ContentHeader
  filter row (or `⌘⇧F`). Renders a Sheet on the right.
- Criteria:
  - Name contains
  - **Extension** (multi-select chips: `.pdf`, `.png`, `.tsx`, …)
  - **MIME type** (multi-select; auto-completed from existing files'
    distinct mime types in the store)
  - Date range — **modified between** + **created between**
  - Size range — slider or from-to inputs in MB
  - Visibility (Private / Shared / Public)
  - Owner (user picker)
  - Tags (when we wire tags from metadata)
- Result count live-updates as criteria change; pressing Apply commits
  to the column filters + a `searchPanel.criteria` slice and shows
  results in the main table with chips above.

**Out of scope for v1:** full-text search across file *contents*. That
needs the auto-RAG track below.

### 3. Image metadata enrichment

We already have an agent that takes an image and returns a structured
metadata blob (alt text / caption / title / description / keywords /
dominant colors). Wire it into cloud-files so users can enrich images
on demand or auto-trigger.

**Resources:**
- Shortcut id: `ed0a90f8-b406-4af8-8f47-c41c0c4ff086` (direct shortcut —
  handles streaming end-to-end and returns the JSON)
- Trigger contract: add the image as a `content part` in the user
  input; the shortcut is "direct" so the response stream contains the
  JSON object.
- Existing thumbnail / image variation API: cloud-files' original
  reason for being. Worth considering auto-triggering thumbnails +
  metadata enrichment in the same upload-finalize pass.

**Plan:**
- New action in the file action bar for image previews:
  **Enhance with AI** → invokes the shortcut → writes the response
  into `cld_files.metadata.image` (the JSON shown below).
- Save the same payload alongside any AI-generated thumbnails.
- Surface in a new **Metadata** tab in the preview pane (same kind of
  tab structure as Versions / Permissions).

**Schema (subject to refinement):**
```json
{
  "image_metadata": {
    "filename_base": "professional-doctor-with-stethoscope-portrait",
    "alt_text": "...",
    "caption": "...",
    "title": "...",
    "description": "...",
    "keywords": ["doctor", "physician", "..."],
    "dominant_colors": ["#E4F1F9", "..."]
  }
}
```

**Open questions:**
- Auto-trigger on upload, or always opt-in via the Enhance button?
  Recommendation: opt-in initially, then add a per-folder
  "auto-enhance images uploaded here" toggle once the cost / latency
  feels right in production.
- How does the user edit the response after it's written? The
  Metadata tab should let them tweak any field, since the AI is a
  starting point not a final answer.

### 4. Auto-RAG over file content

Long-term. Once each upload has been chunked + embedded + indexed,
the search panel and the AI tools both get a step-change in
capability:
- Semantic search ("find the doctor portrait we uploaded last month")
- Q&A grounded in the user's own files
- Recommended-related-files when previewing

**Plan (sketch):**
- Pipeline triggered by the existing upload-finalize webhook on the
  Python side. Add an embedding job per supported mime type (text /
  PDF / image-with-OCR).
- Store chunks + embeddings in a vector index keyed by file id +
  chunk position.
- Surface through:
  1. The Search panel (#2) — semantic match alongside metadata
     match; results merged + scored.
  2. AI agent tools (already planned in `for_python/REQUESTS.md` —
     the `fs_*` tools).
- Cost notes: small embedding model per chunk; image enrichment
  already in #3 piggy-backs by giving us free keywords.

**Status:** parked until #1–#3 are wired and we have real usage data
to inform chunking strategy. Tracked here so we don't lose the
intent.

---

## Quality / polish backlog

- Bulk actions split (real vs virtual) in `BulkActionsBar` — flagged
  by the virtual-source audit; partial failures across mixed
  selections.
- Per-source version history wired into the preview pane (Notes
  has `note_versions`, others vary).
- Drag-source preview ghost shows file icon + name (currently a chip
  with text only).
- Mobile: most of the per-column dropdowns and bulk bar were
  desktop-first; revisit `MobileStack` once the desktop track stabilizes.
