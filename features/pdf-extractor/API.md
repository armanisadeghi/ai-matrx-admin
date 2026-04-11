# PDF Extractor — API Reference

This document describes the PDF extraction endpoints available on the Python backend. All endpoints are prefixed with `/api` (or whatever the configured base URL is for the Python service).

---

## Authentication

All endpoints below require the user to be authenticated. Pass the Supabase JWT in the `Authorization: Bearer <token>` header. Requests without a valid token receive `401`.

---

## Endpoints

### 1. Single File Extraction (existing)

**`POST /pdf/extract-text`**

Accepts a single PDF or image file via multipart form. Returns extracted text immediately (not streamed).

```
Content-Type: multipart/form-data
Body: file = <PDF or image file>
```

Response:
```json
{
  "filename": "report.pdf",
  "text_content": "Full extracted text..."
}
```

This endpoint does **not** save anything to the database or storage. It is a stateless, synchronous extraction.

---

### 2. Batch Extraction (new)

**`POST /pdf/batch-extract`**

Upload multiple files at once. Results stream back one-by-one as each file finishes — you do not wait for the entire batch. Each completed file is saved to the database and its raw file is uploaded to Supabase Storage in the background.

**Request**

```
Content-Type: multipart/form-data
Body: files = <file1>, <file2>, ...   (repeat the "files" field for each file)

Query params (all optional):
  max_concurrent  int  1–5, default 3   How many files to process simultaneously
  force_ocr       bool default false    Force OCR on every page even if native text exists
  use_ocr_threshold int default 100     Min characters before OCR is skipped on a page
```

**Response format**

The response is a streaming NDJSON stream (`application/x-ndjson`). Each line is a JSON object. You receive several infrastructure events first, then one result event per file.

Infrastructure events (can be ignored or used for progress UI):

```jsonc
{"event": "info",    "data": {"message": "Starting batch extraction of 3 file(s)..."}}
{"event": "info",    "data": {"code": "pdf_page_progress", "user_message": "Processed page 1 of 12"}}
{"event": "end",     "data": {}}
```

Per-file result event (one for each file, in completion order, not submission order):

```jsonc
{"event": "data", "data": {
  "doc_id":   "550e8400-e29b-41d4-a716-446655440000",
  "filename": "report.pdf",
  "status":   "done",
  "error":    null
}}
```

On failure for a specific file:

```jsonc
{"event": "data", "data": {
  "doc_id":   null,
  "filename": "broken.pdf",
  "status":   "error",
  "error":    "Description of what went wrong"
}}
```

**What to do with `doc_id`**

Save each `doc_id` as you receive it. You can immediately use it to:
- Fetch the full document: `GET /pdf/documents/{doc_id}`
- Trigger AI cleaning: `POST /pdf/clean-content/{doc_id}`

The `source` field (Supabase Storage URL) on the document may be `null` for a few seconds after extraction while the file uploads in the background. A follow-up `GET` a moment later will have it populated.

---

### 3. List Documents (new)

**`GET /pdf/documents`**

Returns a paginated list of all extracted documents belonging to the authenticated user, ordered newest first.

**Query params**

| Param    | Type | Default | Max | Description         |
|----------|------|---------|-----|---------------------|
| `limit`  | int  | 20      | 100 | Results per page    |
| `offset` | int  | 0       | —   | Pagination offset   |

**Response**

```jsonc
[
  {
    "id":            "550e8400-e29b-41d4-a716-446655440000",
    "user_id":       "user-uuid",
    "name":          "report.pdf",
    "content":       "Full extracted text...",
    "clean_content": null,
    "source":        "https://...supabase.co/storage/v1/object/public/any-file/pdf-extractions/...",
    "created_at":    "2026-04-10T12:00:00+00:00",
    "updated_at":    "2026-04-10T12:00:05+00:00"
  }
]
```

`clean_content` is `null` until AI cleaning has been run on that document.

---

### 4. Get Single Document (new)

**`GET /pdf/documents/{doc_id}`**

Fetch a single document by its ID. Returns `404` if it does not exist or belongs to a different user.

**Response** — same shape as a single item from the list above.

```jsonc
{
  "id":            "550e8400-e29b-41d4-a716-446655440000",
  "user_id":       "user-uuid",
  "name":          "report.pdf",
  "content":       "Full extracted text...",
  "clean_content": null,
  "source":        "https://...supabase.co/storage/v1/object/public/...",
  "created_at":    "2026-04-10T12:00:00+00:00",
  "updated_at":    "2026-04-10T12:00:05+00:00"
}
```

---

### 5. AI Content Cleaning (new)

**`POST /pdf/clean-content/{doc_id}`**

Takes a previously extracted document, sends its raw `content` through an AI agent that cleans up formatting artifacts, OCR noise, and irregular whitespace, then writes the result back to `clean_content` on the document record.

No request body required. Just the `doc_id` in the path.

Returns `404` if the document does not exist or belongs to a different user.
Returns `422` if the document has no extracted content yet.

**Response format**

Streaming NDJSON. Final data event:

```jsonc
{"event": "data", "data": {
  "doc_id":        "550e8400-e29b-41d4-a716-446655440000",
  "clean_content": "Cleaned and formatted text...",
  "usage": {
    "input_tokens":  1204,
    "output_tokens": 980,
    "total_tokens":  2184
  }
}}
{"event": "end", "data": {}}
```

After this completes, `GET /pdf/documents/{doc_id}` will return the document with `clean_content` populated.

---

## Typical Usage Flows

### Upload and read later

```
POST /pdf/batch-extract  (with 1+ files)
  → stream back doc_ids as each file finishes
GET /pdf/documents/{doc_id}  (fetch any time after)
```

### Upload, clean, and display

```
POST /pdf/batch-extract
  → collect doc_ids from the stream
POST /pdf/clean-content/{doc_id}
  → stream receives cleaned text
GET /pdf/documents/{doc_id}
  → both content and clean_content are now populated
```

### List all documents for a user

```
GET /pdf/documents?limit=50&offset=0
```

---

## Document Schema

| Field           | Type              | Notes                                               |
|-----------------|-------------------|-----------------------------------------------------|
| `id`            | string (uuid)     | Stable identifier; use for all follow-up calls      |
| `user_id`       | string (uuid)     | Automatically set from the auth token               |
| `name`          | string            | Original filename                                   |
| `content`       | string or null    | Raw extracted text                                  |
| `clean_content` | string or null    | AI-cleaned version; null until cleaning is run      |
| `source`        | string or null    | Supabase Storage public URL; may be null briefly after upload |
| `created_at`    | ISO 8601 string   | UTC timestamp                                       |
| `updated_at`    | ISO 8601 string   | UTC timestamp; updated whenever clean_content changes |

---

## Streaming Tips

The batch and clean endpoints use NDJSON streaming. Each line is a complete JSON object terminated by `\n`. The standard way to consume this in the frontend is:

```ts
const response = await fetch('/pdf/batch-extract', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop()!; // keep incomplete last line
  for (const line of lines) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.event === 'data') {
      const item = event.data; // BatchItemResult
      console.log(item.doc_id, item.filename, item.status);
    }
  }
}
```
