# RAG over Cloud Files — Python Team Requirements

> **Owned by the Frontend team. The Python team reads this; we update it.**
> Companion to [REQUESTS.md](./REQUESTS.md) and the Virtual Filesystem
> Adapter spec in section 1 of that doc. Anything the Python team wants to
> respond with goes in [from_python/UPDATES.md](../from_python/UPDATES.md).
>
> Last updated: 2026-04-28.

---

## 0. TL;DR

We want the Python backend to ingest every file the user owns — real
S3-backed cloud-files **and** every virtual source (Notes, Code Snippets,
Agent Apps, Prompt Apps, Tool UIs, …) — into a Postgres-native vector
index using `pgvector` on the existing Supabase database. The FE then gets
a search API that mixes semantic similarity, full-text, and metadata
filters; AI agents get the same retrieval primitives as a tool. Images get
an extra enrichment pass through an existing internal agent shortcut that
returns alt-text / caption / keywords / dominant colors, which feed both
the search index and the user-visible metadata tab.

This is one of the highest-leverage features we can build. Files become a
queryable knowledge base instead of a folder tree.

---

## 1. Goals & non-goals

### Goals

1. **Semantic search across all of a user's content** — "find the doctor
   portrait we uploaded last month", "show me notes about the auth
   migration", "which code snippet had that retry helper".
2. **Hybrid ranking** — vector similarity + Postgres FTS + metadata
   filters in one query, returned in a single ranked list.
3. **AI agent grounding** — expose retrieval as a server-side tool so
   `fs_*` agents can ground their answers in the user's files without
   the FE doing any plumbing.
4. **Per-source coverage** — every adapter mounted under `/virtual/*`
   gets indexed, plus real cloud-files. Snippets, notes, agent apps,
   and tool UIs are all searchable through the same surface.
5. **ACL-correct results** — a user can only retrieve content they
   already have access to. This must be enforced at the database level
   via RLS, not at the application layer.
6. **Incremental** — uploads / edits / deletes propagate to the index
   without requiring a full re-embedding sweep.

### Non-goals (v1)

- **Cross-tenant search.** No org-wide aggregation in the first cut.
- **Public web search index.** No external SEO concerns.
- **Real-time sub-second indexing.** Eventual consistency within seconds
  is fine; we'll surface "indexing…" status if needed.
- **Custom embedding model training.** Use off-the-shelf embeddings
  with prompt-cache–friendly inputs; revisit once we have usage data.

---

## 2. Architecture overview

```
┌────────────────────────┐      ┌─────────────────────────┐
│  Upload / edit /       │      │   Virtual source        │
│  delete events         │      │   adapter writes        │
│  (real cloud-files)    │      │   (notes, code,         │
│                        │      │   agent-apps, …)        │
└───────────┬────────────┘      └──────────────┬──────────┘
            │                                  │
            └────────────────┬─────────────────┘
                             ▼
                  ┌────────────────────────┐
                  │  Ingest queue          │
                  │  (Postgres-based;      │
                  │   one row per pending  │
                  │   resource_id)         │
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Worker pool           │
                  │   1. Resolve content   │
                  │   2. Extract text /    │
                  │      OCR / parse PDFs  │
                  │   3. Image enrichment  │
                  │      via shortcut      │
                  │   4. Chunk             │
                  │   5. Embed (batch)     │
                  │   6. Upsert chunks +   │
                  │      embeddings        │
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Supabase Postgres     │
                  │   - cld_rag_chunks     │
                  │   - cld_rag_embeddings │
                  │     (pgvector)         │
                  │   - cld_rag_index_jobs │
                  │   - RLS bound to       │
                  │     source ACL         │
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Search API            │
                  │   POST /rag/search     │
                  │   (hybrid query)       │
                  │                        │
                  │  AI tool surface       │
                  │   rag_search(query)    │
                  └────────────────────────┘
```

Key decisions:

- **Postgres + `pgvector`** — Supabase already supports it. Avoids the
  operational cost of a separate vector DB (Pinecone / Weaviate /
  Qdrant). Keeps RLS in the same place as the source data.
- **One queue, one schema, many sources** — the worker reads
  `cld_rag_index_jobs` rows; each row identifies a source by
  `(source_id, resource_id)` and looks up the right adapter to read
  content from. This piggybacks on the existing virtual-source dispatcher
  the Python team is already building.
- **Server-side only.** The FE never embeds or talks to model providers
  for RAG. Browser only sees the search API.
- **Chunk + embed in batches.** Embedding APIs charge per call; batching
  10–50 chunks per request keeps cost low and throughput reasonable.

---

## 3. Postgres schema

All tables live in the public schema for now. RLS is **mandatory** on
every one.

### 3.1 `cld_rag_chunks`

One row per chunk of source content. Joins back to the originating file or
virtual record via `(source_id, resource_id)`.

```sql
CREATE TABLE cld_rag_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Logical source — "my_files" for real cloud-files, the adapter
  -- sourceId for virtual ("notes", "aga_apps", "code_files", …).
  source_id       text NOT NULL,
  -- The id of the resource within its source. UUID for cloud-files,
  -- adapter-defined string for virtual sources.
  resource_id     text NOT NULL,
  -- Optional field id for multi-field rows (Tool UIs).
  field_id        text,
  -- Owner — denormalized from the source for cheap RLS predicates.
  owner_id        uuid NOT NULL,
  -- Position within the source content (0-based).
  chunk_index     int  NOT NULL,
  -- Raw text chunk. Capped at ~8 KB to fit a reasonable embedding window.
  content         text NOT NULL,
  -- Token count after the embedding model's tokenizer. Useful for
  -- cost/perf debugging.
  token_count     int,
  -- Mime type at chunk time, denormalized for filter queries.
  mime_type       text,
  -- Free-form structured metadata copied from the source — image
  -- enrichment payloads, code language, note tags, etc.
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- For lifecycle: which embedding model + chunker version produced
  -- this row. Lets us re-embed selectively when we upgrade either.
  embedding_model text NOT NULL,
  chunker_version text NOT NULL,
  -- Hash of the input that produced this chunk; if the source content
  -- doesn't change, we don't re-embed.
  source_hash     text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (source_id, resource_id, field_id, chunk_index)
);

CREATE INDEX cld_rag_chunks_owner_idx        ON cld_rag_chunks (owner_id);
CREATE INDEX cld_rag_chunks_resource_idx     ON cld_rag_chunks (source_id, resource_id);
CREATE INDEX cld_rag_chunks_mime_idx         ON cld_rag_chunks (mime_type);
CREATE INDEX cld_rag_chunks_metadata_gin_idx ON cld_rag_chunks USING gin (metadata);
-- FTS column generated from `content`; English config to start, swap to
-- a multi-lingual config when we ship i18n.
ALTER TABLE cld_rag_chunks
  ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX cld_rag_chunks_tsv_idx ON cld_rag_chunks USING gin (content_tsv);
```

### 3.2 `cld_rag_embeddings`

Separated from `cld_rag_chunks` so we can store multiple embeddings
per chunk (different models) without bloating the chunk row.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE cld_rag_embeddings (
  chunk_id     uuid REFERENCES cld_rag_chunks(id) ON DELETE CASCADE,
  -- Same value as cld_rag_chunks.embedding_model — denormalized so we
  -- can index by it.
  model        text NOT NULL,
  -- Width depends on the model. text-embedding-3-small = 1536.
  embedding    vector(1536) NOT NULL,
  PRIMARY KEY (chunk_id, model)
);

-- HNSW for fast ANN, cosine distance metric.
CREATE INDEX cld_rag_embeddings_hnsw_idx
  ON cld_rag_embeddings USING hnsw (embedding vector_cosine_ops);
```

### 3.3 `cld_rag_index_jobs`

Append-only log of pending / running / failed indexing jobs. The worker
pool reads `pending` rows in order, transitions through `running` → `done`
or `failed`. Crash-safe — if a worker dies mid-job, the row stays in
`running` past a heartbeat timeout and another worker picks it up.

```sql
CREATE TYPE cld_rag_job_status AS ENUM ('pending', 'running', 'done', 'failed');

CREATE TABLE cld_rag_index_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    text NOT NULL,
  resource_id  text NOT NULL,
  field_id     text,
  -- "create" | "update" | "delete" — drives the worker action.
  op           text NOT NULL,
  owner_id     uuid NOT NULL,
  status       cld_rag_job_status NOT NULL DEFAULT 'pending',
  -- Number of times the worker has attempted this job.
  attempts     int  NOT NULL DEFAULT 0,
  last_error   text,
  -- Heartbeat — refreshed by the worker every N seconds while running.
  -- A stale heartbeat past the timeout means another worker can claim.
  claimed_by   text,
  claimed_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cld_rag_index_jobs_pending_idx
  ON cld_rag_index_jobs (status, created_at)
  WHERE status IN ('pending', 'running');
```

### 3.4 RLS

Every search query MUST be scoped by `owner_id = auth.uid()`. Because
chunks denormalize `owner_id` from the source, the predicate is cheap
and uniform across sources. For shared resources (e.g. notes shared
through `note_shares`, files with `cld_file_permissions` grants), the
RLS policy must additionally allow rows the user has been granted
read access to:

```sql
CREATE POLICY cld_rag_chunks_owner_or_grantee_read
  ON cld_rag_chunks FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cld_file_permissions p
      WHERE p.resource_id = cld_rag_chunks.resource_id
        AND p.grantee_id = auth.uid()
        AND p.level >= 'read'
    )
    OR EXISTS (
      SELECT 1 FROM note_shares s
      WHERE s.note_id = cld_rag_chunks.resource_id::uuid
        AND s.shared_with = auth.uid()
    )
    -- Add per-source share predicates as new sources gain sharing.
  );
```

The Python team owns these policies — the FE can't enforce them
correctly because it can't trust client-supplied `owner_id`.

---

## 4. Ingestion pipeline

### 4.1 When jobs get enqueued

- **Real cloud-files** — the existing `/files/upload` and version-create
  paths emit a job after the row is committed. `op = "create"` for new
  files, `"update"` for new versions, `"delete"` on soft-delete.
- **Virtual sources** — each adapter's `write` / `delete` / `create`
  in the dispatcher emits a job. Same shape: `(source_id, resource_id,
  op)`.
- **Manual reindex** — `POST /rag/reindex` accepts an array of
  `(source_id, resource_id)` and enqueues `update` jobs. Used by the
  FE when an admin wants to force-refresh without waiting for natural
  edit triggers.

### 4.2 Worker steps

For each `pending` job:

1. **Claim** the row by UPDATE … SET `status = 'running', claimed_by =
   $worker_id, claimed_at = now()` … WHERE `status = 'pending' OR
   (status = 'running' AND claimed_at < now() - INTERVAL '60 seconds')`
   …RETURNING. Standard at-least-once queue pattern.
2. **Resolve content** by dispatching to the right adapter:
   - For `my_files` → `Files.read(resource_id)` (existing Python).
   - For virtual → `adapter.read(resource_id, field_id)`.
   The adapter is also responsible for any extraction side-effects
   (PDF text extraction, OCR for images, transcript for audio).
3. **Compute `source_hash`** — hash of the extracted text (and image
   metadata if applicable). If it matches the most recent
   `cld_rag_chunks.source_hash` for this resource, skip — content
   hasn't changed.
4. **Image enrichment** (if the resource is an image — see §5) — fetch
   the metadata payload from the existing image-metadata shortcut and
   merge into `metadata.image`.
5. **Chunk** the extracted text. Strategy is per-mime:
   - **Plain text / markdown / code** — recursive splitter, target
     ~600 tokens per chunk with 80-token overlap.
   - **PDF** — page-aware, then recursive split within each page;
     keeps citations sane.
   - **Image** — single chunk = `alt_text + caption + keywords +
     description` from the enrichment payload. Embedding lives next
     to text from peers; queries match images naturally.
   - **Audio (if/when we transcribe)** — chunk by ~30-second
     segments anchored on punctuation breaks.
   - **Notes / agent-app code / tool-UI fields** — recursive
     splitter on the raw column content. Notes preserve folder name
     in `metadata.path` so "find notes in the auth migration folder"
     works.
6. **Embed** in batches. Default model: `text-embedding-3-small`
   (1536-d, ~$0.02 / 1M tokens). One batch per worker iteration; worker
   sleeps if no jobs.
7. **Upsert** chunks + embeddings in a single transaction. Delete any
   stale chunks (chunks for this resource with `chunk_index >= new
   count` or with a different `source_hash`). Mark the job `done`.
8. **On error** — increment `attempts`, write `last_error`, set status
   back to `pending` if `attempts < 3`, else `failed`. Workers skip
   `failed` rows; admin tools can re-enqueue.

### 4.3 Backpressure

- One global rate limit on embedding-API calls (configurable). When
  hit, jobs stay in `running` past their heartbeat and naturally
  re-claim later.
- Per-user soft cap on outstanding jobs (default 200) so a bulk import
  doesn't starve other tenants.

---

## 5. Image enrichment subsystem

We already have an internal AI shortcut that takes an image and returns
structured metadata. Wire it into the indexing pipeline so every image
the user uploads gets auto-tagged.

### 5.1 The shortcut

- **Shortcut id:** `ed0a90f8-b406-4af8-8f47-c41c0c4ff086`
- **Trigger contract:** add the image bytes (or a URL the model can
  fetch) as a `content_part` on the user input. The shortcut is
  "direct" so it streams JSON back immediately.
- **Cost:** small model — under 1 cent per image. Negligible at our
  scale.

### 5.2 Output schema

The agent currently returns:

```json
{
  "image_metadata": {
    "filename_base": "professional-doctor-with-stethoscope-portrait",
    "alt_text": "Middle-aged male doctor smiling, wearing a white button-down shirt and a stethoscope around his neck.",
    "caption": "Compassionate care you can trust.",
    "title": "Professional Male Doctor Portrait",
    "description": "A high-quality portrait of a professional male doctor wearing a clean white shirt and stethoscope, symbolizing trusted healthcare services.",
    "keywords": ["doctor", "physician", "healthcare professional", "..."],
    "dominant_colors": ["#E4F1F9", "#F8F8F8", "#C7B7A8", "#2E343A"]
  }
}
```

The FE is open to changing this shape — propose adjustments if you'd
like richer fields (e.g. detected text via OCR, EXIF stuff, faces /
counts). Anything that pays for itself in better search results is on
the table.

### 5.3 Where it lands

- **Persist** the payload at `cld_files.metadata.image` (existing
  `metadata` jsonb column). The FE's Metadata tab in the preview pane
  reads from there.
- **Index** `alt_text + caption + description + keywords` as the chunk
  content for that image. Embed normally.
- **Filter** — promote `keywords` to a dedicated jsonb path so the
  search panel can offer "filter by keyword".

### 5.4 Triggering policy

- **Default:** auto-trigger on every image upload + every replacement
  upload. Cheap enough that opt-in feels worse than opt-out.
- **Per-user toggle** (long-term): user preference to disable
  auto-enrichment if they want a quieter pipeline.
- **Manual re-run:** `POST /rag/reindex` with `force_enrich: true`
  re-runs the shortcut (used when a user explicitly clicks "Enhance
  with AI" again).

---

## 6. Search API

### 6.1 `POST /rag/search`

Single hybrid endpoint. Returns ranked chunks; the FE composes the
result set into "files this content lives in" + previews.

**Request:**

```ts
{
  // Natural language query. Embedded server-side.
  query: string;

  // Optional structured filters — applied as SQL predicates BEFORE
  // ranking, so they're cheap and exact.
  filters?: {
    source_ids?: string[];        // ["my_files", "notes"]
    mime_types?: string[];        // ["application/pdf", "image/png"]
    extensions?: string[];        // [".pdf", ".png"] — derived from filename
    modified_after?: string;      // ISO timestamp
    modified_before?: string;     // ISO timestamp
    visibility?: ("private" | "shared" | "public")[];
    keywords?: string[];          // Match metadata.image.keywords or metadata.tags
    folder_id?: string;           // Only chunks under this folder (cloud-files only)
    owner_id?: string;            // Admin queries; rejected unless caller has admin role
  };

  // Tunables.
  limit?: number;        // Default 20, max 100
  offset?: number;       // Pagination
  // Mix between vector similarity and keyword score in the final rank.
  // 1.0 = pure vector, 0.0 = pure keyword. Default 0.7.
  vector_weight?: number;
}
```

**Response:**

```ts
{
  results: Array<{
    chunk_id: string;
    source_id: string;
    resource_id: string;
    field_id?: string;
    // Source-specific summary the FE renders (we'll dispatch on
    // source_id to render the right card).
    resource_name: string;
    resource_path?: string;
    mime_type?: string;
    // The matching chunk content + a highlight string with <mark>
    // tags for the keyword overlap.
    snippet: string;
    snippet_highlighted: string;
    // The combined score (the vector_weight blend) — clients can
    // re-rank locally if they want.
    score: number;
    // Component scores for debugging / tuning.
    vector_similarity: number;
    keyword_score: number;
    metadata: Record<string, unknown>;
  }>;
  // Total matches before limit/offset. Capped at 1000 to bound the
  // count() cost.
  total: number;
  // Echoed for client-side cache keys.
  query: string;
  // Indexing health — number of pending jobs touching the searched
  // sources. The FE shows "X items still indexing" if non-zero so
  // the user knows missing results aren't a bug.
  pending_jobs: number;
}
```

### 6.2 `GET /rag/health`

Light status endpoint — total chunks, pending jobs, failed jobs in the
last 24h. Used by the FE's admin panel.

### 6.3 `POST /rag/reindex`

Admin-flavored. Body: `{ source_id, resource_ids: string[],
force_enrich?: boolean }`. Enqueues `update` jobs. Auth-gated to file
owner or admin role.

---

## 7. AI agent tool integration

Already covered in [REQUESTS.md §1](./REQUESTS.md). Add one tool:

```py
@tool
def rag_search(query: str, filters: dict | None = None, limit: int = 5) -> list[ChunkResult]:
    """Semantic search across the user's files. Returns up to `limit`
    chunks ranked by relevance to `query`."""
    # Resolves user_id from JWT; calls the same hybrid query as
    # POST /rag/search.
```

This makes every agent tool-using flow capable of grounding answers in
user content with one line. Pair with the `fs_*` tool family for
read/write access.

---

## 8. Re-embedding & lifecycle

- **Content edit** → enqueue `update` job. Worker re-extracts,
  recomputes `source_hash`, only re-embeds if hash changed.
- **Source deleted** → `delete` job. Worker drops chunks for that
  resource; `ON DELETE CASCADE` on `cld_rag_embeddings` cleans
  embeddings.
- **Embedding model upgrade** — add new rows to `cld_rag_embeddings`
  with the new `model`. Search defaults to whichever model the user's
  workspace is configured for. Old rows can be aged out manually.
- **Chunker upgrade** — bump `chunker_version` and bulk-enqueue
  affected resources. Worker drops + re-creates chunks atomically.

---

## 9. Performance targets (v1)

- **End-to-end latency from upload finalize to indexed:** P50 < 30 s,
  P95 < 5 min for files under 10 MB.
- **Search query latency:** P50 < 250 ms for `limit = 20` over a
  user's full corpus (< 100 k chunks). P95 < 800 ms.
- **Embedding cost:** under $5 / month for a typical user (1 GB of
  documents + a few hundred images, mostly cached).
- **Memory:** worker process steady-state < 1 GB resident.

---

## 10. Phased delivery

### Phase A — Foundation (W1)

- Schema migrations + RLS policies.
- Job queue + at-least-once worker loop.
- Real cloud-files (`my_files`) ingestion only.
- Plain text / markdown / code chunkers.
- `POST /rag/search` with vector-only ranking.

**Verifiable:** uploading a `.md` file makes it findable via
`POST /rag/search` within 30 s.

### Phase B — Hybrid + structured filters (W2)

- FTS column + GIN index.
- Hybrid scoring (vector + keyword blend).
- Structured filters (mime, date range, owner, folder).
- Snippets with highlighting.

**Verifiable:** searching for an exact phrase boosts the chunk that
contains it; filtering by `mime_type = "application/pdf"` excludes
others.

### Phase C — PDFs + images (W3)

- PDF text extraction (PyMuPDF / pdfplumber).
- Image enrichment via the shortcut (§5). Persist to
  `cld_files.metadata.image`. Index the enrichment text.

**Verifiable:** uploading the doctor portrait makes "doctor with
stethoscope" return that image's chunk.

### Phase D — Virtual sources (W4)

- Adapter dispatch in the ingest worker — Notes, Code Snippets, Agent
  Apps, Prompt Apps, Tool UIs.
- Per-adapter chunkers tuned to each format.
- Source filtering in the search API.

**Verifiable:** writing "auth helper" in a code snippet makes it
findable via `POST /rag/search?source_ids=code_files`.

### Phase E — AI tool surface (W5)

- `rag_search` tool exposed to agents.
- Telemetry: which queries return zero results, which chunks are
  cited most, which sources hit longest pending-job queues.

**Verifiable:** an agent asked "summarize my notes about X" issues a
`rag_search` call and grounds the answer.

### Phase F — Quality + hardening

- Per-user pending-job dashboard for admin.
- Re-embedding harness for model upgrades.
- Cost dashboards.
- Optional: per-folder enrichment toggles (some folders shouldn't be
  AI-tagged — e.g. private journals).

---

## 11. Open questions for the Python team

1. **Embedding model preference** — `text-embedding-3-small` is the
   safe default. Want to evaluate Cohere embed-v3 / OpenAI 3-large
   for quality? Picking one now and switching later is fine; the
   `model` column in `cld_rag_embeddings` lets us run both side by
   side during a transition.
2. **Worker hosting** — Vercel Functions cron, a long-running worker
   on the Python service, or Postgres `pg_cron` triggering a function?
   We have no preference; you own the runtime.
3. **OCR provider** — for scanned PDFs without an OCR layer. Is the
   image-metadata shortcut sufficient (it's a multimodal LLM and can
   read text in images), or do you want a dedicated OCR pipeline?
4. **Re-embedding budget** — should we cap per-day re-embedding cost
   per user, and tier it like upload quotas? The `cld_account_tiers`
   table already has the framework.
5. **Failure visibility** — surface `failed` jobs in the UI, or just
   log them and let admin re-enqueue? The FE prefers showing a small
   "X items couldn't be indexed — retry" banner.
6. **Keyword extraction for non-image content** — beyond what's in
   `metadata` natively (note tags, code language, etc.), do we want
   an LLM-extracted keyword pass for PDFs / long docs? Same shortcut
   pattern, different prompt. Yes if you think the search panel
   needs richer keyword filters; we can defer.
7. **Multilingual** — at what point do we move from `to_tsvector('english', …)`
   to `simple` or per-locale configs? If a user's notes are largely
   French, English FTS is wrong. Suggest making this user-configurable
   in `userPreferences`.

---

## 12. What the FE will build alongside

To complement the Python work:

- **Search panel** (Sheet) with all the structured filters from §6.1
  + a result preview list.
- **Metadata tab** in the preview pane that renders the `image`
  enrichment payload + lets the user edit any field. Edits write back
  to `cld_files.metadata.image`.
- **"Pending indexing" indicator** on rows whose chunks haven't landed
  yet — driven by `pending_jobs` from the search response or a
  dedicated `GET /rag/jobs?resource_id=…` endpoint.
- **AI tools wired** — `rag_search` exposed in the agent toolbelt so
  any agent flow can ground answers in the user's files.

These are tracked in [`features/files/ROADMAP.md`](../ROADMAP.md).

---

## 13. References

- Existing virtual-source spec: [REQUESTS.md §1](./REQUESTS.md#1--virtual-filesystem-adapter--server-side-parity)
- Cloud-files architecture: [../FEATURE.md](../FEATURE.md)
- Python contract docs (`/files/*`): the existing `cloud_files_frontend.md`
  the team already maintains.
- `pgvector` docs: <https://github.com/pgvector/pgvector>
- Supabase guide on `pgvector` + RLS: <https://supabase.com/docs/guides/ai>
