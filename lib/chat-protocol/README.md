# `lib/chat-protocol/`

The **canonical chat protocol** — a pure TypeScript package that normalizes all chat data from every source (streaming API, database) into a single, strongly-typed format ready for immediate rendering on any platform.

---

## Why this exists

Every chat message in our system arrives in one of two raw formats:

1. **Stream events** — real-time NDJSON lines from the Python backend (`chunk`, `tool_event`, `error`, etc.)
2. **Database records** — `cx_message` rows with JSONB `content` arrays, joined with `cx_tool_call` rows

Before this package, each route, platform, and component had its own parsing logic. This led to:
- Duplicated normalization code across 20+ consumers
- Silent data loss (YouTube embeds, Gemini images, OpenAI tool outputs)
- Type lies (`content: string` for tool results that are actually objects)
- Broken rendering (`[object Object]` for thinking summaries)

This package eliminates all of that. **Every consumer imports from `@/lib/chat-protocol` and receives identical, fully-processed data.**

---

## Architecture

```
  ┌─────────────────────┐      ┌──────────────────────┐
  │  StreamEvent[]      │      │  CxMessage[]         │
  │  (real-time NDJSON) │      │  + CxToolCall[]      │
  └────────┬────────────┘      │  (Supabase / API)    │
           │                   └────────┬─────────────┘
           │                            │
     from-stream.ts               from-db.ts
           │                            │
           └──────────┬─────────────────┘
                      │
                      ▼
             CanonicalMessage
           ┌──────────────────┐
           │  id               │
           │  role             │
           │  timestamp        │
           │  status           │
           │  blocks: [        │
           │    TextBlock      │
           │    ThinkingBlock  │
           │    MediaBlock     │
           │    ToolCallBlock  │
           │    ErrorBlock     │
           │  ]                │
           └──────────────────┘
                      │
                      ▼
              Platform Renderer
         (React, React Native, etc.)
```

---

## Files

| File | Purpose |
|---|---|
| `types.ts` | All canonical types (`CanonicalMessage`, `CanonicalBlock`, `ToolCallBlock`, etc.). Zero dependencies. |
| `from-stream.ts` | Converts `StreamEvent[]` → `CanonicalBlock[]` / `StreamingState` / `CanonicalMessage`. |
| `from-db.ts` | Converts `CxMessage[]` + `CxToolCall[]` → `CanonicalMessage[]`. Handles V1 and V2 DB schemas. |
| `adapters.ts` | **Temporary.** Bridges canonical format → legacy `ChatMessage` / `ToolCallObject` for existing renderers. Marked `@deprecated`. |
| `index.ts` | Barrel file. **Always import from here**, never from individual files. |

---

## Usage

### Import

Always import from the barrel:

```typescript
import {
    buildCanonicalMessages,
    buildStreamingState,
    canonicalToLegacy,
    isToolCallBlock,
    type CanonicalMessage,
    type CanonicalBlock,
} from '@/lib/chat-protocol';
```

### Loading from the database

When a conversation is loaded from Supabase, pass the raw `CxMessage[]` rows and optional `CxToolCall[]` rows:

```typescript
import { buildCanonicalMessages } from '@/lib/chat-protocol';

const messages: CanonicalMessage[] = buildCanonicalMessages(
    conversationData.messages,     // CxMessage[]
    conversationData.toolCalls,    // CxToolCall[] | undefined
);
```

The function:
- Sorts messages by position
- Converts every content block (text, thinking, media, tool_call, code_exec, code_result, web_search)
- Joins tool outputs from `cx_tool_call` rows back onto the correct `ToolCallBlock` by `call_id`
- Merges V1 tool-role messages onto their parent assistant messages
- Skips empty tool-role messages (V2 schema)
- Returns fully immutable `CanonicalMessage[]`

### Processing a live stream

During streaming, call `buildStreamingState` on every new event batch:

```typescript
import { buildStreamingState } from '@/lib/chat-protocol';

// Called on every SSE event batch
const state = buildStreamingState(allEventsReceivedSoFar);

// state.blocks  → CanonicalBlock[] (text + tool calls interleaved in order)
// state.isLive  → true while stream is active
// state.streamError → ErrorBlock if a stream error occurred
```

When the stream completes, finalize into a `CanonicalMessage`:

```typescript
import { buildCanonicalMessageFromStream } from '@/lib/chat-protocol';

const message = buildCanonicalMessageFromStream({
    id: generatedMessageId,
    events: allStreamEvents,
    // optional: timestamp, status
});
```

### Rendering blocks

Every block has a discriminated `type` field. Switch on it:

```typescript
for (const block of message.blocks) {
    switch (block.type) {
        case 'text':
            // block.content — markdown string
            break;
        case 'thinking':
            // block.content — reasoning text (render in collapsible)
            break;
        case 'media':
            // block.kind — 'image' | 'audio' | 'video' | 'document' | 'youtube'
            // block.url  — display URL (or fileUri for Gemini files)
            break;
        case 'tool_call':
            // block.callId   — unique tool invocation ID
            // block.toolName — e.g. "news_get_headlines"
            // block.input    — { name, arguments }
            // block.output   — { status: 'success', result } (if completed)
            // block.error    — { message } (if failed)
            // block.progress — [{ message }] (streaming only)
            // block.phase    — 'pending' | 'running' | 'complete' | 'error'
            break;
        case 'error':
            // block.errorType — error category
            // block.message   — human-readable error
            break;
    }
}
```

Or use the type guard helpers:

```typescript
import { isToolCallBlock, isTextBlock } from '@/lib/chat-protocol';

const toolBlocks = message.blocks.filter(isToolCallBlock);
const textBlocks = message.blocks.filter(isTextBlock);
```

### Legacy adapter (temporary)

Existing renderers that expect the old `ChatMessage` + `ToolCallObject[]` format can use the adapters:

```typescript
import { canonicalArrayToLegacy } from '@/lib/chat-protocol';

// Convert canonical → legacy for existing components
const legacyMessages = canonicalArrayToLegacy(canonicalMessages);
```

> **These adapters are `@deprecated` and will be removed** once all renderers switch to consuming `CanonicalBlock` directly.

---

## Type Reference

### `CanonicalMessage`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable UUID (from DB) or ephemeral ID (streaming) |
| `role` | `'user' \| 'assistant' \| 'system'` | Message sender |
| `timestamp` | `Date` | When the message was created |
| `status` | `'pending' \| 'streaming' \| 'complete' \| 'error'` | Processing state |
| `isCondensed` | `boolean` | Whether this message was condensed out of context |
| `blocks` | `ReadonlyArray<CanonicalBlock>` | Ordered content blocks |
| `schemaVersion` | `1` | Protocol version for future migrations |

### `CanonicalBlock` (discriminated union)

| `type` value | Interface | Key fields |
|---|---|---|
| `'text'` | `TextBlock` | `content: string` |
| `'thinking'` | `ThinkingBlock` | `content: string` |
| `'media'` | `MediaBlock` | `kind`, `url`, `fileUri?`, `mimeType?` |
| `'tool_call'` | `ToolCallBlock` | `callId`, `toolName`, `input`, `output?`, `error?`, `progress`, `phase` |
| `'error'` | `ErrorBlock` | `errorType`, `message` |

### `ToolCallBlock` (details)

| Field | Type | Description |
|---|---|---|
| `callId` | `string` | Unique invocation ID (backend `call_id`) |
| `toolName` | `string` | Tool name, e.g. `"news_get_headlines"` |
| `input` | `ToolInput` | `{ name, arguments }` |
| `output` | `ToolOutput?` | `{ status: 'success', result }` — present when complete |
| `error` | `ToolError?` | `{ message }` — present on failure |
| `progress` | `ToolProgress[]` | Transient progress messages (streaming only, empty from DB) |
| `phase` | `'pending' \| 'running' \| 'complete' \| 'error'` | Execution state for UI |

---

## Design Rules

1. **Pure TypeScript.** No JSX, no React, no browser APIs, no Node APIs. This package runs identically on web, React Native, Electron, Chrome extensions, and server-side.

2. **Always import from `index.ts`.** Never import directly from `from-stream.ts` or `from-db.ts`. The barrel file is the stable API surface.

3. **Immutable output.** Every returned object uses `readonly` fields. Never mutate the output.

4. **Ordered blocks.** A `CanonicalBlock[]` preserves the exact arrival order of text and tool events. Never split this into parallel arrays.

5. **No `any`, no `unknown` in the public surface.** Every field is strongly typed so renderers can switch on discriminated unions without casts.

6. **Version the protocol.** If the shape of `CanonicalMessage` or `CanonicalBlock` changes, bump `PROTOCOL_VERSION` in `types.ts` and add a migration function.

---

## Tool State Contract — Critical Rules for All Renderers

`ToolCallBlock.phase` is the **single source of truth** for a tool's execution state:

| `phase`    | Meaning                            | UI indicator           |
|------------|------------------------------------|------------------------|
| `pending`  | Tool request issued, not started   | Spinner (starting)     |
| `running`  | `tool_started` received            | Spinner (working)      |
| `complete` | `tool_completed` received          | Checkmark              |
| `error`    | `tool_error` received              | Error icon             |

**Rules:**

- **ALWAYS read `phase` from the `ToolCallBlock` or from `ToolCallObject.phase` (on the `mcp_input` entry).** Never infer phase from the position of entries in an array, the presence of `mcp_output`, or the type of the last array entry.

- **NEVER assume `mcp_output` is the last entry.** Progress messages (`user_message` type) may appear after the output in some code paths. Only `phase` is guaranteed to reflect the true execution state.

- **Tool events can arrive out of order or interleaved.** The canonical protocol handles this — renderers must not assume a specific ordering of `mcp_input → progress → mcp_output`.

- **A running tool with no output is valid.** Phase `'running'` with no `mcp_output` is the correct state while the tool is executing. Show a spinner. Do not wait for `mcp_output` to transition away from `"starting"`.

### If you are building a new tool renderer

Use `ToolCallBlock` directly from the canonical protocol when possible. If you must use the legacy `ToolCallObject[]` adapter path:

```ts
// ✅ Correct — use phase from the input entry
const inputEntry = toolUpdates.find(u => u.type === 'mcp_input');
const phase = inputEntry?.phase ?? 'pending';
const isComplete = phase === 'complete' || phase === 'error';

// ❌ Wrong — last entry is NOT reliably mcp_output
const isComplete = toolUpdates[toolUpdates.length - 1]?.type === 'mcp_output';

// ❌ Wrong — any() check also fails if progress arrives after output
const isComplete = toolUpdates.some(u => u.type === 'mcp_output');
// (use `phase` instead — it is always correct regardless of entry order)
```

---

## Backend Alignment

This package is verified against two backend analysis documents:

- **`PROTOCOL_SYNC_ANALYSIS.md`** — Compares `matrx_ai/context/events.py` (stream events) with `types/python-generated/stream-events.ts` and `from-stream.ts`. All 9 event types and 6 tool event subtypes are aligned.

- **`DB_SCHEMA_SYNC_ANALYSIS.md`** — Compares every Python `to_storage_dict()` method with the TypeScript `CxContentBlock` types and `from-db.ts` conversion logic. All 11 content block types are handled.

When the Python backend changes, update `types/python-generated/stream-events.ts` and re-verify against these documents.

---

## Migration Plan

The adapters in `adapters.ts` exist solely to keep existing renderers working during the transition. The migration path is:

1. ✅ **Done** — Create the canonical protocol package
2. ✅ **Done** — Integrate into the SSR chat route
3. **Next** — Update `MessageDisplay.tsx` and `ChatMarkdown` to accept `CanonicalBlock` directly
4. **Next** — Update the tool renderer registry to receive `ToolCallBlock` instead of `ToolCallObject[]`
5. **Next** — Update `ChatContext.tsx` to store `CanonicalMessage[]` instead of `ChatMessage[]`
6. **Final** — Delete `adapters.ts`, delete `tool-event-engine.ts`, delete `cx-content-converter.ts`
