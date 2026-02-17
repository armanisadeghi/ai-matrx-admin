# API Migration Guide — Frontend Changes Required

This document describes the backend API changes and what the frontend team needs to update.

---

## 1. Route Path Changes

All endpoints are now grouped by feature under `/api/{feature}/...`. The base URL remains the same.

| Old URL | New URL | Notes |
|---|---|---|
| `/api/health` | `/api/health` | Unchanged |
| `/api/health/detailed` | `/api/health/detailed` | Unchanged |
| `/api/chat/unified` | `/api/ai/chat/unified` | Added `/ai` prefix |
| `/api/chat/direct` | **REMOVED** | Use `/api/ai/chat/unified` instead |
| `/api/agent/warm` | `/api/ai/agent/warm` | Added `/ai` prefix |
| `/api/agent/execute` | `/api/ai/agent/execute` | Added `/ai` prefix |
| `/api/scraper/quick-scrape` | `/api/scraper/quick-scrape` | Unchanged |
| `/api/scraper/search` | `/api/scraper/search` | Unchanged |
| `/api/scraper/search-and-scrape` | `/api/scraper/search-and-scrape` | Unchanged |
| `/api/scraper/search-and-scrape-limited` | `/api/scraper/search-and-scrape-limited` | Unchanged |
| `/api/scraper/mic-check` | `/api/scraper/mic-check` | Unchanged |
| `/api/tools/test/list` | `/api/tools/test/list` | Unchanged |
| `/api/tools/test/{tool_name}` | `/api/tools/test/{tool_name}` | Unchanged |
| `/api/tools/test/session` | `/api/tools/test/session` | Unchanged |
| `/api/tools/test/execute` | `/api/tools/test/execute` | Unchanged |
| `/api/pdf/extract-text` | `/api/utilities/pdf/extract-text` | Moved to `/utilities` |
| `/api/examples` | `/api/tests/examples` | Moved to `/tests`, admin-only |
| `/api/stream/text` | `/api/tests/stream/text` | Moved to `/tests`, admin-only |

**Action:** Update any hardcoded URLs or API client base paths that reference the changed routes above. Most changes are in AI-related endpoints (adding `/ai` prefix) and PDF (moving to `/utilities`).

---

## 2. Authentication — No Header Changes

The auth headers are **unchanged**:

- **Authenticated users:** `Authorization: Bearer <jwt_token>`
- **Guest users:** `X-Fingerprint-ID: <fingerprint_js_id>`

You can still send both headers — the backend prioritizes the JWT token when present.

---

## 3. Auth Enforcement Tiers

Endpoints are now grouped by authentication level. If you hit an endpoint without the required auth, you'll receive a clear error response.

| Feature | Auth Required | Notes |
|---|---|---|
| `/api/health/*` | None | Public endpoints |
| `/api/ai/agent/warm` | None | Public (cache warming) |
| `/api/ai/*` | Fingerprint OR Token | Guest access allowed |
| `/api/utilities/*` | Fingerprint OR Token | Guest access allowed |
| `/api/scraper/*` | Valid JWT Token | Must be authenticated |
| `/api/tools/*` | Valid JWT Token | Must be authenticated |
| `/api/tests/*` | Valid JWT Token + Admin | Admin-only |

---

## 4. Request Context Convention — Where Org/Project/Task Go

Auth data (user, admin, fingerprint) is handled automatically by middleware and **never sent in the request body**. It comes from headers only.

Everything else — org, project, task, conversation, and any domain-specific scope — goes in the **request body** as part of the endpoint's Pydantic model. This is the standard convention for REST APIs.

### What goes WHERE

| Data | Where | How |
|---|---|---|
| User identity | `Authorization` header | Automatic — middleware extracts it |
| Guest identity | `X-Fingerprint-ID` header | Automatic — middleware extracts it |
| Organization ID | Request body | `"organization_id": "uuid"` |
| Project ID | Request body | `"project_id": "uuid"` |
| Task ID | Request body | `"task_id": "uuid"` |
| Conversation ID | Request body | `"conversation_id": "uuid"` |
| Any domain scope | Request body | Added to each endpoint's schema as needed |

### Example — Full Request

```bash
POST /api/ai/agent/execute
Authorization: Bearer eyJhb...
X-Fingerprint-ID: fp_abc123
Content-Type: application/json

{
  "prompt_id": "my-prompt",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_new_conversation": false,
  "user_input": "Hello, world",
  "organization_id": "org-uuid",
  "project_id": "proj-uuid"
}
```

The backend extracts auth from headers (automatic, never touches the body) and reads domain context from the body (explicit per endpoint).

### Why This Convention

- **Headers for identity:** JWT/fingerprint are security credentials. They belong in headers per HTTP and OAuth standards.
- **Body for domain data:** Org/project/task are business-logic scoping, not authentication. They vary per endpoint and belong in the structured request body where they can be validated by Pydantic.
- **No mixing:** We never put auth in the body and never put domain data in headers. This keeps things clean and predictable.

---

## 5. Per-Endpoint Request Body Reference

### `/api/ai/agent/warm` (POST) — Public

```json
{
  "prompt_id": "string (required)",
  "is_builtin": "boolean (default: false)"
}
```

No changes from before. No auth required.

### `/api/ai/agent/execute` (POST) — Guest OK

```json
{
  "prompt_id": "string (required)",
  "conversation_id": "string | null (auto-generated if new)",
  "is_new_conversation": "boolean (default: true)",
  "user_input": "string | array | null",
  "variables": "object | null",
  "config_overrides": "object | null",
  "is_builtin": "boolean (default: false)",
  "stream": "boolean (default: true)",
  "debug": "boolean (default: true)"
}
```

No changes from before. Returns NDJSON streaming response.

### `/api/ai/chat/unified` (POST) — Guest OK

```json
{
  "ai_model_id": "string (required)",
  "messages": "array (required)",
  "conversation_id": "string | null (auto-generated if new)",
  "is_new_conversation": "boolean (default: true)",
  "max_iterations": "int (default: 20)",
  "max_retries_per_iteration": "int (default: 2)",
  "stream": "boolean (default: true)",
  "debug": "boolean (default: false)",
  "system_instruction": "string | null",
  "max_output_tokens": "int | null",
  "temperature": "float | null",
  "top_p": "float | null",
  "top_k": "int | null",
  "tools": "string[] | null",
  "tool_choice": "any | null",
  "parallel_tool_calls": "boolean (default: true)",
  "reasoning_effort": "string | null",
  "response_format": "object | null",
  "metadata": "object | null",
  "store": "boolean (default: true)"
}
```

No changes from before. Returns NDJSON streaming response. Extra fields accepted (model has `extra="allow"`).

### `/api/scraper/quick-scrape` (POST) — Authenticated

```json
{
  "urls": "string[] (required)",
  "use_cache": "boolean (default: true)",
  "stream": "boolean (default: false)",
  "get_text_data": "boolean (default: true)",
  "get_organized_data": "boolean (default: false)",
  "get_structured_data": "boolean (default: false)",
  "get_overview": "boolean (default: false)",
  "get_main_image": "boolean (default: false)",
  "get_links": "boolean (default: false)"
}
```

No changes from before.

### `/api/scraper/search` (POST) — Authenticated

```json
{
  "keywords": "string[] (required)",
  "country_code": "string (default: 'all')",
  "total_results_per_keyword": "int (default: 5, range: 1-100)",
  "search_type": "string (default: 'all')"
}
```

No changes from before.

### `/api/scraper/search-and-scrape` (POST) — Authenticated

```json
{
  "keywords": "string[] (required)",
  "country_code": "string (default: 'all')",
  "total_results_per_keyword": "int (default: 10, range: 10-30)",
  "search_type": "string (default: 'all')",
  "...scrape_options": "same as quick-scrape"
}
```

No changes from before.

### `/api/scraper/search-and-scrape-limited` (POST) — Authenticated

```json
{
  "keyword": "string (required, singular)",
  "country_code": "string (default: 'all')",
  "max_page_read": "int (default: 10, range: 1-20)",
  "search_type": "string (default: 'all')",
  "...scrape_options": "same as quick-scrape"
}
```

No changes from before.

### `/api/tools/test/list` (GET) — Authenticated

Query params: `?category=string` (optional)

No changes from before.

### `/api/tools/test/{tool_name}` (GET) — Authenticated

Path param: `tool_name` (string)

No changes from before.

### `/api/tools/test/session` (POST) — Authenticated

No request body. Returns `{ conversation_id, user_id }`.

No changes from before.

### `/api/tools/test/execute` (POST) — Authenticated

```json
{
  "tool_name": "string (required)",
  "arguments": "object (required)",
  "conversation_id": "string | null"
}
```

No changes from before. Returns NDJSON streaming response.

### `/api/utilities/pdf/extract-text` (POST) — Guest OK

Multipart form upload: `file` (PDF or image file).

Returns `{ filename, text_content }`.

No changes from before (only the URL changed from `/api/pdf/extract-text`).

### `/api/health` (GET) — Public

No request body. Returns `{ status, service, timestamp }`.

### `/api/health/detailed` (GET) — Public

No request body. Returns `{ status, service, timestamp, components, version }`.

---

## 6. Standardized Error Responses

All non-streaming error responses now follow a consistent shape:

```json
{
  "error": "auth_required",
  "message": "Authentication or X-Fingerprint-ID header required",
  "user_message": "Authentication required. Please sign in.",
  "details": null,
  "request_id": "a1b2c3d4e5f6"
}
```

| Field | Type | Description |
|---|---|---|
| `error` | `string` | Machine-readable error code |
| `message` | `string` | Developer-facing detail (for debugging) |
| `user_message` | `string` | Safe to display directly in the UI |
| `details` | `any \| null` | Extra info (validation errors, etc.) |
| `request_id` | `string` | Unique request ID for support/debugging |

### Common Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `auth_required` | 401 | No token or fingerprint provided |
| `token_required` | 401 | Endpoint requires a valid JWT |
| `admin_required` | 403 | Endpoint requires admin privileges |
| `validation_error` | 422 | Request body failed validation |
| `not_found` | 404 | Resource not found |
| `internal_error` | 500 | Unexpected server error |

### Streaming Error Events

Streaming responses (NDJSON) now use the same field names:

```json
{"event": "error", "data": {"error": "agent_error", "message": "...", "user_message": "..."}}
```

**Breaking change:** The `type` field has been renamed to `error` and `user_visible_message` has been renamed to `user_message` to match the standard error shape.

---

## 7. Quick Migration Checklist

- [ ] Update URLs for `/api/ai/chat/unified`, `/api/ai/agent/warm`, `/api/ai/agent/execute`
- [ ] Update URL for `/api/utilities/pdf/extract-text`
- [ ] Remove any references to `/api/chat/direct` (deprecated endpoint removed)
- [ ] Update streaming error parsing: `data.type` → `data.error`
- [ ] Update streaming error parsing: `data.user_visible_message` → `data.user_message`
- [ ] Update non-streaming error parsing to use the new `APIError` shape
- [ ] Test auth flows: fingerprint-only endpoints, token-required endpoints
- [ ] No changes needed for request bodies — all schemas are identical
- [ ] No changes needed for auth headers — same `Authorization` and `X-Fingerprint-ID`
