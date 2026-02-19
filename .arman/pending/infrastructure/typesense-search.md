# Typesense — Self-Hosted Full-Text Search

**Category:** Yes — But deployed as a separate service on Coolify
**Status:** Not yet implemented

---

## Decision

Self-host Typesense on your existing Coolify server (same infra as `matrx-engine`). Both the Next.js admin app and the Python backend can talk to it directly via the Typesense HTTP API.

**Why Typesense over Algolia:**
- Free, unlimited usage (self-hosted)
- Sub-50ms search with typo tolerance out of the box
- Simple REST API, no lock-in
- Perfect for: prompt library search, canvas search, notes, organizations, users

---

## Part 1 — Deploy on Coolify

### Docker Compose (add to your Coolify instance)

```yaml
version: '3.8'
services:
  typesense:
    image: typesense/typesense:27.1
    restart: unless-stopped
    ports:
      - "8108:8108"
    volumes:
      - typesense-data:/data
    environment:
      TYPESENSE_API_KEY: ${TYPESENSE_API_KEY}
      TYPESENSE_DATA_DIR: /data
      TYPESENSE_ENABLE_CORS: true
    command: "--data-dir /data --api-key=${TYPESENSE_API_KEY} --listen-port 8108"

volumes:
  typesense-data:
```

### Coolify Setup Steps

1. Create a new service in Coolify → Docker Compose
2. Paste the compose above
3. Set env var: `TYPESENSE_API_KEY=your-strong-key-here`
4. Expose port 8108 (or put behind reverse proxy with SSL)
5. Note your public URL: `https://search.yourdomain.com`

---

## Part 2 — Next.js Client (ai-matrx-admin)

### Install

```bash
pnpm add typesense
```

### Environment Variables

```bash
TYPESENSE_HOST=search.yourdomain.com
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=your-admin-key
NEXT_PUBLIC_TYPESENSE_SEARCH_KEY=your-search-only-key  # Read-only, safe for browser
```

### Client Setup: `lib/typesense/client.ts`

```typescript
import Typesense from 'typesense';

export const typesenseAdminClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST!,
    port: parseInt(process.env.TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || 'https',
  }],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 2,
});

// Read-only client for browser
export const typesenseSearchClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST!,
    port: parseInt(process.env.TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || 'https',
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY!,
  connectionTimeoutSeconds: 2,
});
```

### Schema Example: Prompts Collection

```typescript
// lib/typesense/schemas.ts
export const promptsSchema = {
  name: 'prompts',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'content', type: 'string' },
    { name: 'tags', type: 'string[]', optional: true, facet: true },
    { name: 'category', type: 'string', optional: true, facet: true },
    { name: 'user_id', type: 'string', facet: true },
    { name: 'created_at', type: 'int64' },
    { name: 'is_public', type: 'bool', facet: true },
  ],
  default_sorting_field: 'created_at',
};
```

### Sync Supabase → Typesense (API Route)

```typescript
// app/api/search/sync/route.ts
import { typesenseAdminClient } from '@/lib/typesense/client';

export async function POST(req: Request) {
  const { collection, document } = await req.json();
  await typesenseAdminClient
    .collections(collection)
    .documents()
    .upsert(document);
  return Response.json({ success: true });
}
```

### Trigger sync from Supabase: Database Webhook → `/api/search/sync`

---

## Part 3 — Python Client (matrx-engine)

```bash
uv add typesense
```

```python
import typesense
import os

client = typesense.Client({
    "nodes": [{"host": os.environ["TYPESENSE_HOST"], "port": "443", "protocol": "https"}],
    "api_key": os.environ["TYPESENSE_API_KEY"],
    "connection_timeout_seconds": 2,
})

async def index_document(collection: str, doc: dict):
    client.collections[collection].documents.upsert(doc)

async def search(collection: str, query: str, query_by: str = "title,content"):
    return client.collections[collection].documents.search({
        "q": query,
        "query_by": query_by,
        "per_page": 20,
    })
```

---

## Pending Tasks

### Infrastructure
- [ ] Add Typesense Docker Compose service to Coolify
- [ ] Generate strong admin API key + separate search-only key
- [ ] Configure reverse proxy / SSL for search endpoint
- [ ] Test connectivity from both Next.js (Vercel) and Python (Docker)

### Next.js (ai-matrx-admin)
- [ ] Install `typesense` package
- [ ] Create `lib/typesense/client.ts`
- [ ] Define collection schemas for: prompts, canvases, notes, organizations
- [ ] Create `/api/search/sync` endpoint
- [ ] Set up Supabase database webhooks to trigger sync on insert/update/delete
- [ ] Build search UI component with instant results + typo tolerance

### Python (matrx-engine)
- [ ] Install `typesense` package
- [ ] Create `engine/services/search.py`
- [ ] Index AI-generated content (recipes, workflows, outputs) as they're created

### Optional
- [ ] Instantsearch.js or custom React component for search UX
- [ ] Faceted filtering UI (by category, tags, user)
