# Python Block Processing — Required Fixes

> **Scope:** All issues listed here are Python-side bugs or design problems that must be fixed in the
> Python block processing pipeline (`aidream`). The goal is for every client (React, React Native,
> Swift, HTML/Vite, Electron, etc.) to receive data that renders directly — zero additional parsing,
> zero field renaming, zero shape-guessing on the client side.

---

## Issue 1 — Snake_case keys instead of camelCase

**Severity:** Critical — breaks all clients by default.

**What the server currently sends:**
```json
{ "block_id": "blk_0", "block_index": 0, "type": "text", ... }
```

**What every client expects:**
```json
{ "blockId": "blk_0", "blockIndex": 0, "type": "text", ... }
```

**Affected fields (minimum):**
| Current (snake_case) | Required (camelCase) |
|---|---|
| `block_id` | `blockId` |
| `block_index` | `blockIndex` |
| `correct_answer` | `correctAnswer` |
| `is_diff` | `isDiff` |
| `is_complete` | `isComplete` |
| `raw_markdown` | `rawMarkdown` |
| `complete_row_count` | `completeRowCount` |
| `total_rows` | `totalRows` |
| `has_partial_content` | `hasPartialContent` |
| `content_hash` | `contentHash` |
| `quiz_title` | `quizTitle` |
| `multiple_choice` | `multipleChoice` |
| `raw_content` | `rawContent` |

**Rule:** Every key in every `data` object, every `metadata` object, and every top-level block field
must be camelCase. This applies to both the JSON endpoint and the NDJSON stream.

**Note:** The `type` field string values (e.g. `"text"`, `"quiz"`, `"table"`) are fine as-is since
they map directly to block type identifiers.

---

## Issue 2 — Table block emits as `type: "text"` during streaming and stays `"text"` on completion

**Severity:** Critical — tables never render as tables in stream mode.

**What the server sends (stream, final complete event):**
```json
{"event":"content_block","data":{"block_id":"blk_2","block_index":2,"type":"text","status":"complete","content":"| Model | Speed | ...","metadata":{"isComplete":true,...}}}
```

**What it must send:**
```json
{"event":"content_block","data":{"blockId":"blk_2","blockIndex":2,"type":"table","status":"complete","content":"| Model | Speed | ...","data":{"headers":[...],"rows":[[...]],...},"metadata":{"isComplete":true,...}}}
```

**Problem:** During streaming the table content is detected and typed as `"text"` because the block
type is not promoted when the parser recognizes it. The final `status: "complete"` event must emit
the correct `type: "table"` with the fully parsed `data` field (same as the JSON endpoint already
does correctly).

**Rule:** A block's `type` must reflect what the block *is*, not how it started. If a block is
detected as a table mid-stream, all subsequent events for that block (including the final `complete`
event) must carry `type: "table"` and the structured `data` field.

---

## Issue 3 — Quiz block: wrong data shape AND streamed as `type: "code"` then finalized as `type: "code"`

**Severity:** Critical — quizzes never render from the block protocol.

### 3a — Wrong type during and after streaming

**Stream events for a quiz block all say `type: "code"`:**
```json
{"event":"content_block","data":{"block_id":"blk_1","block_index":1,"type":"code","status":"streaming","data":{"language":"json",...}}}
```

The final `status: "complete"` event also says `type: "code"`. The client never knows this is a quiz.

**Required:** Once the quiz JSON is complete and parsed, the `complete` event must be emitted with
`type: "quiz"` and the structured `data` field. There is no acceptable reason for a client to
receive `type: "code"` for a quiz block.

### 3b — Wrong field names in the parsed quiz `data` object

**What the JSON endpoint currently returns inside `data`:**
```json
{
  "title": "Comprehensive Cell Cycle Understanding",
  "category": "Biology",
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": [...],
      "correct_answer": 1,
      "explanation": "..."
    }
  ],
  "content_hash": "6dfe5b..."
}
```

**What the React quiz renderer (`RawQuizJSON`) requires:**
```json
{
  "quizTitle": "Comprehensive Cell Cycle Understanding",
  "category": "Biology",
  "multipleChoice": [
    {
      "id": 1,
      "question": "...",
      "options": [...],
      "correctAnswer": 1,
      "explanation": "..."
    }
  ]
}
```

**Diff of required changes inside the quiz `data` object:**

| Current field | Required field |
|---|---|
| `title` | `quizTitle` |
| `questions` | `multipleChoice` |
| `correct_answer` (per question) | `correctAnswer` (per question) |
| `content_hash` | Can be omitted — clients generate their own hash if needed |

**Note:** The `content_hash` should not be required from the server at all. Clients should not
depend on a server-generated hash. Remove it or make it entirely optional.

### 3c — "Loading quiz" indefinitely (JSON mode)

Because the `data` object uses `title` instead of `quizTitle` and `questions` instead of
`multipleChoice`, `isValidQuizData()` on the React side returns false, causing the component to
fall through to the loading state indefinitely. This is a direct consequence of Issue 3b.

---

## Issue 4 — `type` must be the final resolved type on ALL events for a block, not just the last one

**Severity:** High — affects any block type whose identity is only known after content completes
(table, quiz, potentially others).

**Current behavior:** A block starts with `type: "text"` or `type: "code"` and only changes type
(sometimes) at the `complete` event. Some blocks never change type at all.

**Required behavior:** Once a block's true type is known (even if mid-stream), all subsequent
events for that block must carry the correct `type`. The client cannot be expected to track type
transitions per `blockId`.

**Rule:** `type` is immutable per block from the moment it is first detected. If the type cannot
be determined until the block is complete, that is acceptable — but the `complete` event must
always carry the correct type. Emitting a `complete` event with the wrong type is never acceptable.

---

## Issue 5 — Streaming `data` field is inconsistently present

**Severity:** Medium — causes flicker/state confusion in renderers.

During streaming, the `data` field (structured parsed data) appears on some events but not others
for the same block. For example, a code block emits:

```json
{"type":"code","status":"streaming","data":{"language":"pytho","code":"","is_diff":false}}  // first event, truncated language
{"type":"code","status":"streaming","data":{"language":"python","code":"def gr","is_diff":false}}  // second event
```

The first event has `"pytho"` (truncated) as the language. This forces the client to either:
- Ignore all streaming `data` until `status: "complete"` (wastes the streaming protocol), or
- Handle partially-correct data

**Required:** During streaming, the `data` field should only be emitted once it is internally
consistent. A `language` field should never be emitted with a truncated value. Either:
- Omit `data` entirely during streaming and only include it on the `complete` event, OR
- Only emit `data` fields that are fully known at the time of emission (e.g. `language` is known
  as soon as the opening fence is parsed — it should not be streamed character by character)

---

## Issue 6 — `metadata` on text blocks should not include table-detection fields mid-stream

**Severity:** Low — causes confusing intermediate states.

During table streaming, `blk_2` is typed as `"text"` and its `metadata` carries:
```json
{"isComplete":true,"completeRowCount":0,"totalRows":0,"hasPartialContent":false}
```

This is contradictory: `isComplete: true` but `totalRows: 0`. These metadata fields are table-specific
and must not appear on a `type: "text"` block. Once the block type is promoted to `"table"`, the
table metadata is appropriate.

---

## Summary Table

| # | Issue | Severity | Affects JSON | Affects Stream |
|---|---|---|---|---|
| 1 | Snake_case keys throughout | Critical | ✓ | ✓ |
| 2 | Table type not promoted to `"table"` | Critical | ✗ | ✓ |
| 3 | Quiz wrong type (`"code"`) + wrong data shape | Critical | ✓ (shape) | ✓ (type + shape) |
| 4 | `type` must be resolved on all events for a block | High | N/A | ✓ |
| 5 | Streaming `data` field emitted with truncated values | Medium | N/A | ✓ |
| 6 | Table metadata leaked onto `type: "text"` blocks | Low | N/A | ✓ |

---

## Contract the Python Pipeline Must Meet

For each block event emitted (stream or JSON), the following must hold:

1. All keys are **camelCase** — no exceptions.
2. `type` reflects the **true block type** — never a generic fallback (`"text"`, `"code"`) for a
   block that has been identified as a richer type.
3. `data` shape matches the **exact field names** the component expects (see Issue 3b for quiz).
4. `data` fields are only emitted when they are **fully known** — no truncated values.
5. `status: "complete"` events carry the full `data` object with all parsed fields.

These rules ensure any rendering client can consume block events directly without any
transformation, field renaming, or type inference.

---

## Issue 7 — `data` field missing for structured blocks during streaming (presentation, quiz, etc.)

**Severity:** Critical — silently falls back to client-side parsing, defeating the entire purpose.

**What is currently happening:**

For structured blocks like `presentation`, `quiz`, `table`, etc., the stream events carry the raw
JSON in `content` but send **no `data` field** (or `data: null`) until the final `complete` event.
The final `complete` event often also sends no `data`.

**Confirmed with this real stream output:**
```jsonc
// All streaming events for blk_1:
{"event":"content_block","data":{"blockId":"blk_1","blockIndex":1,"type":"presentation","status":"streaming","content":"{...partial json...}","metadata":{"language":"json"}}}
// ← NO "data" field at all

// Final complete event:
{"event":"content_block","data":{"blockId":"blk_1","blockIndex":1,"type":"presentation","status":"complete","content":"{...full json...}","metadata":{"language":"json","isComplete":true}}}
// ← STILL NO "data" field
```

**What this means in practice:**

`block.serverData` is always `null` for these blocks. Every client falls through to parsing
`block.content` themselves:

```typescript
// BlockRenderer.tsx — what actually runs:
case "presentation":
    if (block.serverData) { ... }  // null — skipped every time
    const presentationData = safeJsonParse(block.content);  // ← client parses raw JSON
    return <Slideshow slides={presentationData.presentation.slides} />;
```

**Why this is a critical architectural failure:**

The entire point of server-side processing is that the `data` field carries an already-parsed,
structured object that any client can use directly. Without it:

- React falls back to client-side `JSON.parse` + field access — same as before the pipeline
- Swift, React Native, and other clients **have no `data` to use** and must implement their own parsers
- The pipeline provides zero value for these blocks beyond labelling the `type`

**What Python must send on the `status: "complete"` event:**

```jsonc
{
  "event": "content_block",
  "data": {
    "blockId": "blk_1",
    "blockIndex": 1,
    "type": "presentation",
    "status": "complete",
    "content": "{\"presentation\":{...}}",
    "data": {
      "presentation": {
        "title": "Your Presentation Title Here",
        "slides": [
          { "type": "intro", "title": "Main Title", "subtitle": "..." },
          { "type": "content", "title": "Slide Title", "description": "...", "bullets": ["..."] }
        ]
      }
    },
    "metadata": { "isComplete": true }
  }
}
```

**Affected block types (all structured blocks):**
- `presentation` — needs `data.presentation.slides` (array)
- `quiz` — needs `data.quizTitle`, `data.category`, `data.multipleChoice` (array)
- `table` — needs parsed table structure (not just raw markdown)
- `cooking_recipe`, `timeline`, `research`, `resources`, `progress_tracker`
- `comparison_table`, `decision_tree`, `diagram`, `math_problem`
- `questionnaire`

**Rule:** For every block with `type` other than `text` or `code`, the final `status: "complete"`
event **must** include a fully-parsed `data` object. The `content` field (raw string) is optional
on the complete event but `data` is mandatory.
