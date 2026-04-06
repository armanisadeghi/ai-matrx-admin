# Canvas Artifact Integration — Developer Instructions

> **Audience:** Claude Code agent working on AI Matrx frontend (Matrx Admin / Next.js + React + TypeScript)
> **Date:** 2025-03-25
> **Status:** Database migration applied. Frontend integration needed.

---

## What Changed in the Database

### New columns on `canvas_items`

| Column | Type | Default | Notes |
|---|---|---|---|
| `source_message_id` | `uuid` (FK → `cx_message.id`) | NULL | Was `text`, now properly typed. ON DELETE SET NULL. |
| `artifact_index` | `smallint` | NULL | Sequential number from model output. `artifact_1` → `1`. NULL = not from model artifact tags. |
| `version` | `smallint` | `1` | Auto-incremented by `cx_canvas_update_version`. |
| `parent_canvas_id` | `uuid` (FK → self) | NULL | Points to root canvas_item in a version chain. NULL = this IS the root. |
| `source_type` | `text` | `'model_direct'` | One of: `model_direct`, `model_converted`, `user_created`, `forked` |

### New unique constraint

`uq_canvas_items_message_artifact` on `(source_message_id, artifact_index)` — partial, only where both are NOT NULL. Prevents duplicate artifacts per message. Enables upsert behavior.

### No breaking changes

All new columns are nullable or have defaults. Existing code that reads/writes `canvas_items` without these columns will continue to work. The `source_message_id` type changed from `text` to `uuid` but all existing rows had NULL values so no data was affected.

---

## RPC Functions Available

All functions are in the `public` schema. Call via Supabase client `.rpc('function_name', { params })`.

### Core Write Operations

#### `cx_canvas_upsert`
**Use when:** AI Dream parses `<artifact>` tags from model output.

```typescript
const { data } = await supabase.rpc('cx_canvas_upsert', {
  p_user_id: userId,
  p_message_id: messageId,       // cx_message.id of the assistant message
  p_artifact_index: 1,            // parsed from "artifact_1"
  p_type: 'iframe',               // your canvas type
  p_title: 'Revenue Dashboard',
  p_content: { data: '...', type: 'iframe', metadata: {} },  // jsonb
  p_conversation_id: null,        // auto-resolved from message if null
  p_source_type: 'model_direct'
})
```

Behavior: INSERT on first call. If same `(source_message_id, artifact_index)` already exists, UPDATE content/title/type in place. Returns the `canvas_items` row.

#### `cx_canvas_create_manual`
**Use when:** The app converts model prose/response into a canvas (NOT parsed from `<artifact>` tags), or user creates one manually.

```typescript
const { data } = await supabase.rpc('cx_canvas_create_manual', {
  p_user_id: userId,
  p_type: 'flashcards',
  p_title: 'History Flashcards',
  p_content: { data: '...', type: 'flashcards' },
  p_source_type: 'model_converted',    // or 'user_created'
  p_conversation_id: conversationId,   // optional
  p_source_message_id: messageId       // optional — link back to the message that inspired it
})
```

Behavior: Always INSERT (no upsert). `artifact_index` is set to NULL since this wasn't model-tagged. Returns the `canvas_items` row.

#### `cx_canvas_update_version`
**Use when:** The model updates an existing artifact in a later message (reuses the same `artifact_1` ID in a subsequent response).

```typescript
const { data } = await supabase.rpc('cx_canvas_update_version', {
  p_user_id: userId,
  p_original_canvas_id: originalCanvasId,  // the canvas_items.id being "updated"
  p_new_message_id: newMessageId,          // the new cx_message that contains the update
  p_artifact_index: 1,
  p_type: 'iframe',
  p_title: 'Revenue Dashboard v2',
  p_content: { data: '...updated...' }
})
```

Behavior: Creates a NEW `canvas_items` row with `parent_canvas_id` pointing to the root of the version chain. Automatically increments `version`. Returns the new row.

### Read Operations

#### `cx_canvas_get_by_message`
Returns all artifacts linked to a specific message, ordered by `artifact_index`.

```typescript
const { data } = await supabase.rpc('cx_canvas_get_by_message', {
  p_message_id: messageId
})
// Returns: canvas_items[] ordered by artifact_index
```

#### `cx_canvas_get_conversation_latest`
Returns the **latest version** of each artifact in a conversation. Use for sidebar/panel view.

```typescript
const { data } = await supabase.rpc('cx_canvas_get_conversation_latest', {
  p_conversation_id: conversationId
})
// Returns: canvas_items[] — one per artifact chain, latest version only
```

#### `cx_canvas_get_version_history`
Returns all versions of an artifact given ANY version's ID. Walks the parent chain to find root, then returns all descendants.

```typescript
const { data } = await supabase.rpc('cx_canvas_get_version_history', {
  p_canvas_id: anyVersionId
})
// Returns: canvas_items[] ordered by version ASC
```

#### `cx_canvas_list_by_user`
Paginated list with optional filters. All filter params are optional (NULL = no filter).

```typescript
const { data } = await supabase.rpc('cx_canvas_list_by_user', {
  p_user_id: userId,
  p_type: 'iframe',              // optional
  p_is_favorited: true,          // optional
  p_source_type: 'model_direct', // optional
  p_limit: 50,
  p_offset: 0
})
```

### Actions

#### `cx_canvas_toggle_favorite`
Toggles `is_favorited`. Returns the new boolean state.

```typescript
const { data: isFavorited } = await supabase.rpc('cx_canvas_toggle_favorite', {
  p_canvas_id: canvasId
})
```

#### `cx_canvas_archive`
Soft-archives. Set `p_include_versions: true` to archive entire version chain.

```typescript
await supabase.rpc('cx_canvas_archive', {
  p_canvas_id: canvasId,
  p_include_versions: true
})
```

#### `cx_canvas_publish`
Snapshots to `shared_canvas_items` for public sharing. Sets `is_public = true` and generates a `share_token`.

```typescript
const { data: sharedItem } = await supabase.rpc('cx_canvas_publish', {
  p_canvas_id: canvasId,
  p_visibility: 'public'
})
// sharedItem.share_token is the public share ID
```

---

## Integration Points

### 1. Artifact Parsing (AI Dream / Python Backend)

When the model response contains `<artifact>` tags, the Python backend should:

1. Parse each `<artifact id="artifact_N" type="..." title="...">` tag
2. Extract `artifact_index` as `int(id.split('_')[1])`
3. Call `cx_canvas_upsert` per artifact with the `cx_message.id` of the assistant message

For responses converted to canvas by app logic (not via `<artifact>` tags), call `cx_canvas_create_manual` with `source_type='model_converted'`.

### 2. Artifact Updates Across Messages

When the model reuses an artifact ID (e.g., `artifact_1` in message 5 was first created in message 2):

1. Frontend or backend must detect that `artifact_1` already exists in this conversation
2. Look up the existing `canvas_items` row via `cx_canvas_get_conversation_latest`
3. Call `cx_canvas_update_version` with the original's `id` as `p_original_canvas_id`

### 3. Message Rendering

When rendering a `cx_message`, fetch its artifacts:

```typescript
const artifacts = await supabase.rpc('cx_canvas_get_by_message', { p_message_id: message.id })
```

Render artifact cards/panels at the positions where `<artifact>` tags appeared in the prose. Do NOT re-parse raw message content on every render.

### 4. Conversation Canvas Panel (Sidebar)

```typescript
const latestArtifacts = await supabase.rpc('cx_canvas_get_conversation_latest', {
  p_conversation_id: conversationId
})
```

Shows one entry per artifact (latest version). Clicking one can show version history via `cx_canvas_get_version_history`.

### 5. Temporary React Keys

Before the RPC returns a real `canvas_items.id`, use `${messageId}:${artifactIndex}` as a temporary React key. Replace with the real UUID once persisted.

---

## `source_type` Values

| Value | Meaning | When to use |
|---|---|---|
| `model_direct` | Parsed from `<artifact>` tags in model output | `cx_canvas_upsert` (default) |
| `model_converted` | App logic converted model response to canvas | `cx_canvas_create_manual` — e.g., "save as flashcards" button on a model response |
| `user_created` | User created manually, no model involvement | `cx_canvas_create_manual` |
| `forked` | Forked/remixed from another artifact | `cx_canvas_create_manual` |

---

## Content JSONB Structure

Existing convention (unchanged):

```json
{
  "data": "...",          // string or object depending on type
  "type": "iframe",       // mirrors canvas_items.type
  "metadata": { ... }     // optional metadata
}
```

Types in use: `iframe`, `diagram`, `flashcards`. Add new types as needed — there is no enum constraint, it's a text column.
