# DB Schema Sync Analysis — matrx-ai ↔ matrx-admin

**Compared:**
- **Backend storage layer (source of truth):**
  - `matrx-ai/matrx_ai/config/unified_content.py` — `to_storage_dict()` per content class
  - `matrx-ai/matrx_ai/config/media_config.py` — media content `to_storage_dict()` methods
  - `matrx-ai/matrx_ai/config/tools_config.py` — tool content `to_storage_dict()` methods
  - `matrx-ai/matrx_ai/config/extra_config.py` — code/web-search content `to_storage_dict()` methods
  - `matrx-ai/matrx_ai/config/message_config.py` — `UnifiedMessage.to_storage_dict()`
  - `matrx-ai/matrx_ai/config/unified_config.py` — `UnifiedConfig.to_storage_dict()`
  - `matrx-ai/matrx_ai/orchestrator/requests.py` — `CompletedRequest.to_storage_dict()`
  - `matrx-ai/matrx_ai/db/custom/persistence.py` — final DB write path
- **Frontend types:**
  - `matrx-admin/features/public-chat/types/cx-tables.ts` — DB row types
  - `matrx-admin/lib/chat-protocol/from-db.ts` — DB → CanonicalBlock conversion
  - `matrx-admin/lib/chat-protocol/types.ts` — canonical types

---

## VERDICT: 9 concrete issues found, 3 are CRITICAL data-loss bugs

---

## How the DB write pipeline works

```
UnifiedConfig / content objects
    │
    ▼ each content type's .to_storage_dict()           ← transformation happens HERE
cx_message.content  (JSONB array of blocks)
    │
    ▼ from-db.ts convertContentBlocks()                ← frontend reads this
CanonicalBlock[]
```

Every `to_storage_dict()` method defines the **exact shape stored in `cx_message.content`**.
Those shapes must match what `from-db.ts` and `cx-tables.ts` expect.

---

## Issue 1 — CRITICAL: `ThinkingContent.summary` stored as `list[dict]`, typed as `string[]`

### Python writes (`ThinkingContent.to_storage_dict()`):
```python
if self.summary:
    result["summary"] = [
        item.model_dump() if hasattr(item, "model_dump") else item
        for item in self.summary
    ]
```
`summary` items are **Pydantic model dumps or plain dicts**, e.g.:
```json
[{ "type": "summary_text", "text": "The model reasoned that..." }]
```

### Frontend types (`cx-tables.ts`):
```typescript
export interface CxThinkingContent {
    type: 'thinking';
    text: string;
    provider?: string;
    signature?: string;
    signature_encoding?: string;
    summary?: string[];          // ← typed as string[], but DB stores object[]
}
```

### What breaks (`from-db.ts`):
```typescript
const content =
    block.text ||
    (block.summary?.length ? block.summary.join('\n') : 'Thinking…');
```
`Array<{type: string, text: string}>.join('\n')` in JavaScript produces:
`"[object Object]\n[object Object]"` — **completely broken rendering**.

### Fix:

**`cx-tables.ts`:**
```typescript
export interface CxThinkingSummaryItem {
    type: string;        // "summary_text" from OpenAI
    text: string;
}

export interface CxThinkingContent {
    type: 'thinking';
    text: string;
    provider?: string;
    signature?: string;
    signature_encoding?: string;
    summary?: CxThinkingSummaryItem[];    // dict objects, not strings
    metadata?: Record<string, unknown>;   // Python always writes this
}
```

**`from-db.ts` (`convertThinkingContent`):**
```typescript
function convertThinkingContent(block: CxThinkingContent): ThinkingBlock {
    let content = block.text;
    if (!content && block.summary?.length) {
        // summary items are objects with a .text field
        content = block.summary
            .map(item => (typeof item === 'string' ? item : (item as {text?: string}).text ?? ''))
            .filter(Boolean)
            .join('\n');
    }
    return { type: 'thinking', content: content || 'Thinking…' };
}
```

---

## Issue 2 — CRITICAL: `CxMediaContent.kind` missing `'youtube'`

### Python writes (`YouTubeVideoContent.to_storage_dict()`):
```python
{
    "type": "media",
    "kind": "youtube",    # ← stored as "youtube"
    "url": self.url,
    "metadata": { "video_metadata": ... }
}
```

### Frontend types (`cx-tables.ts`):
```typescript
export interface CxMediaContent {
    type: 'media';
    kind: 'image' | 'audio' | 'video' | 'document';  // ← 'youtube' is MISSING
    url: string;
    ...
}
```

### What breaks (`from-db.ts`):
```typescript
case 'media': {
    const b = convertMediaContent(block as CxMediaContent);  // type assertion is wrong
    if (b) blocks.push(b);
    break;
}
```
`convertMediaContent` is passed a block with `kind: 'youtube'` but TypeScript types it as
`CxMediaContent` which only allows 4 kinds. The function gets called but then:
```typescript
function convertMediaContent(block: CxMediaContent): MediaBlock | null {
    if (!block.url) return null;
    return {
        type: 'media',
        kind: block.kind,          // 'youtube' propagates into MediaBlock
        url: block.url,
        ...
    };
}
```
But `MediaBlock` in `types.ts` also only accepts `'image' | 'audio' | 'video' | 'document'`
— TypeScript will error here, or at runtime the value will simply be `'youtube'` with no
renderer knowing how to handle it (silently dropped or broken display).

Additionally, `CxMediaKind` in `cx-tables.ts` (on `cx_media` table) already has `'youtube'` —
it was forgotten on `CxMediaContent`.

### Fix:

**`cx-tables.ts`:**
```typescript
export interface CxMediaContent {
    type: 'media';
    kind: 'image' | 'audio' | 'video' | 'document' | 'youtube';  // add 'youtube'
    url: string;
    ...
}
```

**`types.ts` (`MediaBlock`):**
```typescript
export interface MediaBlock {
    readonly type: 'media';
    readonly kind: 'image' | 'audio' | 'video' | 'document' | 'youtube';  // add 'youtube'
    readonly url: string;
    readonly mimeType?: string;
}
```

**`from-db.ts` — add a YouTube case or ensure the generic path handles it.**

---

## Issue 3 — CRITICAL: `from-db.ts` drops media blocks stored with `file_uri` only (no url)

### Python storage — all media types can be stored without a url:
```python
# ImageContent.to_storage_dict() — url is optional:
result: dict = { "type": "media", "kind": "image" }
if self.url:         result["url"] = self.url          # ← only written if present
if self.file_uri:    result["file_uri"] = self.file_uri # ← GCS / Gemini File API URIs
if self.base64_data: result["base64_data"] = self.base64_data
```

So a Google Gemini file uploaded via the File API will be stored as:
```json
{ "type": "media", "kind": "image", "file_uri": "gs://bucket/...", "mime_type": "image/png" }
```
(No `url` field.)

### Frontend type (`cx-tables.ts`):
```typescript
export interface CxMediaContent {
    type: 'media';
    kind: 'image' | 'audio' | 'video' | 'document';
    url: string;    // ← required, no fallback for file_uri
    ...
}
```

### What breaks (`from-db.ts`):
```typescript
function convertMediaContent(block: CxMediaContent): MediaBlock | null {
    if (!block.url) return null;   // ← silently drops file_uri-only blocks
    return { type: 'media', kind: block.kind, url: block.url, ... };
}
```
Any media block stored with only `file_uri` (common for Google Gemini) is **silently dropped**
and never rendered.

### Fix:

**`cx-tables.ts`:**
```typescript
export interface CxMediaContent {
    type: 'media';
    kind: 'image' | 'audio' | 'video' | 'document' | 'youtube';
    url?: string;              // optional — blocks can be file_uri-only
    file_uri?: string;
    base64_data?: string;      // add this — Python stores it
    mime_type?: string;
    metadata?: Record<string, unknown>;
}
```

**`from-db.ts`:**
```typescript
function convertMediaContent(block: CxMediaContent): MediaBlock | null {
    // Use url OR fall back to file_uri (Google Gemini File API)
    const url = block.url ?? block.file_uri ?? null;
    if (!url) return null;
    return {
        type: 'media',
        kind: block.kind as MediaBlock['kind'],
        url,
        ...(block.mime_type ? { mimeType: block.mime_type } : {}),
    };
}
```

**`types.ts` (`MediaBlock`)** — add optional `fileUri` if renderers need to distinguish.

---

## Issue 4 — HIGH: Three content block types stored but completely missing from frontend

Python writes these to `cx_message.content` but the frontend has no type for them, no
`switch` branch in `from-db.ts`, and they fall into the `default` handler that only
salvages a `text` field (none of these have a `text` field, so they are silently dropped).

### `CodeExecutionContent.to_storage_dict()`:
```python
{ "type": "code_exec", "language": "python", "code": "<the code>" }
```

### `CodeExecutionResultContent.to_storage_dict()`:
```python
{ "type": "code_result", "output": "<stdout>", "outcome": "success" }
```

### `WebSearchCallContent.to_storage_dict()`:
```python
{ "type": "web_search", "id": "...", "status": "...", "metadata": { "action": {...} } }
```

All three are produced by Google Gemini (code execution) and OpenAI (web search). Any
conversation using these features will have **silently empty** code and web search blocks.

### Fix:

**Add to `cx-tables.ts`:**
```typescript
export interface CxCodeExecContent {
    type: 'code_exec';
    language: string;
    code: string;
}

export interface CxCodeResultContent {
    type: 'code_result';
    output: string;
    outcome: string;
}

export interface CxWebSearchContent {
    type: 'web_search';
    id?: string;
    status?: string;
    metadata?: { action?: Record<string, unknown> };
}

// Add to CxContentBlock union:
export type CxContentBlock =
    | CxTextContent
    | CxThinkingContent
    | CxMediaContent
    | CxToolCallContent
    | CxToolResultContent
    | CxCodeExecContent
    | CxCodeResultContent
    | CxWebSearchContent;
```

**Add to `types.ts` (`CanonicalBlock`) — decide on canonical representation** (e.g., fold
code execution into a `CodeBlock`, web search into a specialized block, or fallback to
`TextBlock` for now with formatted content).

**Add handlers to `from-db.ts`:**
```typescript
case 'code_exec': {
    // Render code blocks as text for now
    const b = block as unknown as CxCodeExecContent;
    blocks.push({ type: 'text', content: `\`\`\`${b.language}\n${b.code}\n\`\`\`` });
    break;
}
case 'code_result': {
    const b = block as unknown as CxCodeResultContent;
    blocks.push({ type: 'text', content: `\`\`\`\n${b.output}\n\`\`\`` });
    break;
}
case 'web_search': {
    // Web search is informational — can be shown as status or omitted
    break;
}
```

---

## Issue 5 — HIGH: OpenAI tool call `call_id` not used for tool output lookup

### Python storage — `ToolCallContent.to_storage_dict()`:
```python
{
    "type": "tool_call",
    "name": "...",
    "arguments": {...},
    "id": self.id,           # OpenAI: fc_01... (message-level ID)
    "call_id": self.call_id  # OpenAI: call_01... (call-level ID, joins to cx_tool_call.call_id)
}
```

OpenAI uses **two different IDs**: `id` (message/reasoning item identity) and `call_id`
(the actual function call ID). The `cx_tool_call.call_id` column stores the **`call_id`**,
not the `id`.

### Frontend lookup (`from-db.ts`):
```typescript
case 'tool_call': {
    const raw2   = block as unknown as Record<string, unknown>;
    const callId = String(raw2.id ?? raw2.tool_call_id ?? '');  // ← never checks raw2.call_id
    ...
    const output = callIdOutputMap.get(callId);   // ← will miss OpenAI outputs
}
```

For OpenAI conversations, `block.id = "fc_01..."` but `cx_tool_call.call_id = "call_01..."`.
The lookup fails silently — tool outputs are **never shown** for OpenAI conversations.

For Anthropic, `id = "toolu_01..."` which does match `cx_tool_call.call_id`. ✅
For Google, `id = hash(tool_name)` which matches if the logger used the same hash. ✅

### Fix:

**`cx-tables.ts` — add `call_id` to `CxToolCallContent`:**
```typescript
export interface CxToolCallContent {
    type: 'tool_call';
    id?: string;             // provider message-level ID (optional — may be absent)
    call_id?: string;        // OpenAI call-level ID (joins to cx_tool_call.call_id)
    name: string;
    arguments: Record<string, unknown>;
}
```

**`from-db.ts` — check `call_id` first for OpenAI compatibility:**
```typescript
case 'tool_call': {
    const raw2   = block as unknown as Record<string, unknown>;
    // call_id (OpenAI) takes priority; fall back to id (Anthropic/Google) or tool_use_id (legacy)
    const callId = String(raw2.call_id ?? raw2.id ?? raw2.tool_call_id ?? raw2.tool_use_id ?? '');
    ...
}
```

---

## Issue 6 — MEDIUM: `CxToolCallContent.id` typed as required, but Python writes it as optional

### Python storage:
```python
result = { "type": "tool_call", "name": ..., "arguments": ... }
if self.id:
    result["id"] = self.id   # only written if non-empty
if self.call_id:
    result["call_id"] = self.call_id
```
`id` may be absent from the block entirely.

### Frontend type:
```typescript
export interface CxToolCallContent {
    type: 'tool_call';
    id: string;    // ← required, but Python may omit it
    name: string;
    arguments: Record<string, unknown>;
}
```

### Fix:
```typescript
export interface CxToolCallContent {
    type: 'tool_call';
    id?: string;             // optional — Python only writes when non-empty
    call_id?: string;        // OpenAI call-level ID
    name: string;
    arguments: Record<string, unknown>;
}
```

---

## Issue 7 — MEDIUM: `CxToolResultContent.content` typed as `string`, but Python writes any type

### Python storage (`ToolResultContent.to_storage_dict()`):
```python
{
    "type": "tool_result",
    "name": ...,
    "content": self.content,   # ← list[dict] | dict | str — NOT always a string
    "tool_use_id": ...,
    "call_id": ...,
    "is_error": ...
}
```
In practice, `content` is whatever the tool returned — often a structured JSON object or list.

### Frontend type:
```typescript
export interface CxToolResultContent {
    type: 'tool_result';
    tool_call_id: string;   // ← Python writes "tool_use_id", not "tool_call_id"
    name: string;
    content: string;        // ← typed as string, but DB may store {} or []
    is_error: boolean;
}
```

NOTE: `from-db.ts` already handles both field name variants (`tool_call_id ?? tool_use_id`), so
the field name mismatch is not a runtime bug — but the type definition is still misleading.

### Fix:
```typescript
export interface CxToolResultContent {
    type: 'tool_result';
    tool_use_id?: string;    // Python writes this
    tool_call_id?: string;   // legacy name
    call_id?: string;        // OpenAI-specific
    name: string;
    content: unknown;        // may be string | object | array — check before display
    is_error?: boolean;      // Python only writes this when true
}
```

---

## Issue 8 — LOW: `CxThinkingContent` missing `metadata` field

Python always writes a `metadata` field on thinking blocks (even if empty `{}`):
```python
result = {
    "type": "thinking",
    "text": self.text,
    "provider": self.provider,
    "metadata": self.metadata,    # always present
}
if self.id:
    result["metadata"]["id"] = self.id   # id stored inside metadata
```

The frontend type has no `metadata` field. `from-db.ts` also doesn't read `metadata`.
This means the `id` (used for provider-specific API continuations) is stored but
the frontend type doesn't reflect it. Doesn't affect rendering today, but needs
to be present for future provider-side thinking continuation.

### Fix (`cx-tables.ts`):
```typescript
export interface CxThinkingContent {
    type: 'thinking';
    text: string;
    provider?: string;
    signature?: string;
    signature_encoding?: string;
    summary?: CxThinkingSummaryItem[];     // see Issue 1
    metadata?: Record<string, unknown>;    // add this
}
```

---

## Issue 9 — LOW: Type generation comment still references old `aidream` path

(Same as the stream-events analysis — no new action required beyond what was already documented in
`PROTOCOL_SYNC_ANALYSIS.md`.)

---

## Complete field-by-field reference: Python → DB → Frontend

### `cx_message.content` block types

| Python class | `type` stored in DB | In `CxContentBlock`? | In `from-db.ts`? | Status |
|---|---|---|---|---|
| `TextContent` | `"text"` | ✅ `CxTextContent` | ✅ | OK |
| `ThinkingContent` | `"thinking"` | ✅ `CxThinkingContent` | ✅ (but broken summary) | **Issue 1, 8** |
| `ImageContent` | `"media"` + `kind:"image"` | ✅ | ✅ (but drops file_uri) | **Issue 3** |
| `AudioContent` | `"media"` + `kind:"audio"` | ✅ | ✅ (but drops file_uri) | **Issue 3** |
| `VideoContent` | `"media"` + `kind:"video"` | ✅ | ✅ (but drops file_uri) | **Issue 3** |
| `YouTubeVideoContent` | `"media"` + `kind:"youtube"` | ❌ missing `'youtube'` kind | ⚠️ propagates as unknown kind | **Issue 2** |
| `DocumentContent` | `"media"` + `kind:"document"` | ✅ | ✅ (but drops file_uri) | **Issue 3** |
| `ToolCallContent` | `"tool_call"` | ✅ `CxToolCallContent` | ✅ (but wrong callId for OpenAI) | **Issues 5, 6** |
| `ToolResultContent` | `"tool_result"` | ✅ `CxToolResultContent` | ✅ | **Issue 7** |
| `CodeExecutionContent` | `"code_exec"` | ❌ missing | ❌ silently dropped | **Issue 4** |
| `CodeExecutionResultContent` | `"code_result"` | ❌ missing | ❌ silently dropped | **Issue 4** |
| `WebSearchCallContent` | `"web_search"` | ❌ missing | ❌ silently dropped | **Issue 4** |

### `ThinkingContent.to_storage_dict()` field mapping

| Python field | DB key | TS type | Correct? |
|---|---|---|---|
| `text` | `"text"` | `string` | ✅ |
| `provider` | `"provider"` | `string?` | ✅ |
| `signature` (bytes→base64) | `"signature"` | `string?` | ✅ |
| `signature_encoding` | `"signature_encoding"` | `string?` | ✅ |
| `summary` (list of dicts) | `"summary"` | `string[]` | ❌ **Issue 1** |
| `metadata` (dict, always) | `"metadata"` | missing | ❌ **Issue 8** |
| `id` (stored in metadata.id) | `metadata.id` | not in TS type | ❌ **Issue 8** |

### Media `to_storage_dict()` common field mapping

| Python field | DB key | TS type in `CxMediaContent` | Correct? |
|---|---|---|---|
| `"media"` (literal) | `"type"` | `'media'` | ✅ |
| `kind` (varies) | `"kind"` | `'image'\|'audio'\|'video'\|'document'` | ❌ missing `'youtube'` **Issue 2** |
| `url` (optional) | `"url"` | `string` (required) | ❌ **Issue 3** |
| `file_uri` (optional) | `"file_uri"` | `string?` | ✅ typed, but `from-db.ts` ignores it **Issue 3** |
| `base64_data` (optional) | `"base64_data"` | missing | ❌ **Issue 3** |
| `mime_type` (optional) | `"mime_type"` | `string?` | ✅ |
| `metadata` (optional dict) | `"metadata"` | `Record<string,unknown>?` | ✅ |

### `ToolCallContent.to_storage_dict()` field mapping

| Python field | DB key | TS type in `CxToolCallContent` | Correct? |
|---|---|---|---|
| `name` | `"name"` | `string` | ✅ |
| `arguments` | `"arguments"` | `Record<string,unknown>` | ✅ |
| `id` (conditional) | `"id"` | `string` (required) | ❌ **Issue 6** |
| `call_id` (conditional) | `"call_id"` | missing | ❌ **Issue 5** |

### `cx_conversation.config` JSONB keys (Python → DB)

These keys are written by `UnifiedConfig.to_storage_dict()` into the `config` JSONB column.
The frontend types this as `Record<string, unknown>` — no validation. Not a breaking issue
but listed here for completeness:

| Key | Type | Notes |
|---|---|---|
| `temperature` | `number` | only if set |
| `max_output_tokens` | `number` | only if set |
| `top_p` | `number` | only if set |
| `top_k` | `number` | only if set |
| `tools` | `array` | only if non-empty |
| `tool_choice` | `"none"\|"auto"\|"required"` | only if set |
| `parallel_tool_calls` | `false` | only written when `False` (default `True` is omitted) |
| `reasoning_effort` | `string` | OpenAI extended thinking level |
| `reasoning_summary` | `string` | OpenAI thinking summary mode |
| `thinking_level` | `string` | Google Gemini 3 thinking level |
| `include_thoughts` | `boolean` | Google Gemini |
| `thinking_budget` | `number` | Anthropic / Google Gemini 2 budget |
| `response_format` | `object` | structured output schema |
| `stop_sequences` | `string[]` | only if non-empty |
| `stream` | `true` | only written when streaming (default omitted) |
| `internal_web_search` | `boolean` | only if set |
| `internal_url_context` | `boolean` | only if set |
| `store` | `boolean` | OpenAI response storage |
| `verbosity` | `string` | only if set |

---

## Priority order for fixes

| Priority | Issue | Impact |
|---|---|---|
| P0 | Issue 1: `summary` rendered as `[object Object]` | Thinking blocks visibly broken |
| P0 | Issue 3: `file_uri`-only media dropped | Google Gemini images/videos invisible |
| P0 | Issue 5: OpenAI tool outputs never shown | All OpenAI tool calls appear to have no output |
| P1 | Issue 2: `'youtube'` kind unhandled | YouTube embeds invisible |
| P1 | Issue 4: `code_exec`, `code_result`, `web_search` silently dropped | AI code output invisible |
| P2 | Issue 6: `id` required but may be absent | TypeScript type error at runtime |
| P2 | Issue 7: `content` typed as `string` | Type lie, may break parsers |
| P3 | Issue 8: `metadata` missing from thinking type | No rendering impact today |
