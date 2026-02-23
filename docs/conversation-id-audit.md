# Conversation ID Audit

**Last updated:** 2026-02-22
**Context:** After the backend refactor to 3-endpoint architecture, this tracks every frontend
caller of the AI streaming endpoints and whether it correctly captures and persists the
server-assigned `conversation_id` from the `X-Conversation-ID` response header.

---

## How the handshake works

1. **Backend** sets `X-Conversation-ID` in the HTTP response headers before any body is sent.
2. **Frontend** reads `response.headers.get('X-Conversation-ID')` immediately after `fetch()` resolves — before any stream events are processed.
3. For conversation continuation, the frontend hits `POST /api/ai/conversations/{conversationId}` instead of `POST /api/ai/agents/{agentId}`.

`parseNdjsonStream()` already returns `{ events, requestId, conversationId }` from the header.
The stream also emits a `data` event with `event === 'conversation_id'` as a belt-and-suspenders fallback.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented — reads header, persists, routes continuation correctly |
| ⚠️ | Partial — reads header but does not enable continuation |
| ❌ | Missing — does not read or use conversation_id at all |
| N/A | Not applicable — stateless endpoint or non-AI domain |

---

## Production Callers

### `features/public-chat/hooks/useAgentChat.ts`
**Status: ✅ Complete**

- Reads `conversationId` from `X-Conversation-ID` header immediately after fetch resolves.
- Also listens for the `data` stream event as a fallback.
- Stores in `state.dbConversationId` via `setDbConversationId()`.
- Routes first message to `ENDPOINTS.ai.agentStart(promptId)`, follow-ups to `ENDPOINTS.ai.conversationContinue(dbConversationId)`.
- Exposes `conversationId` to consumers.

---

### `features/prompt-apps/components/PromptAppPublicRendererFastAPI.tsx`
**Status: ✅ Complete** *(fixed 2026-02-22)*

- Reads `X-Conversation-ID` header after fetch, stores in `dbConversationIdRef` (sync) + `dbConversationId` state (reactive).
- First call routes to `agentStart`; subsequent calls route to `conversationContinue`.
- Exposes `conversationId` and `onResetConversation` as props to dynamic custom components.
- Background logging call uses the server-assigned ID (not a client-generated UUID).

**Custom component props added:**
```typescript
conversationId: string | null       // null on first call, set after first response
onResetConversation: () => void     // clears conversation, next call starts fresh
```

**Usage in custom components:**
```typescript
// Follow-up message
onExecute({}, "What else can you tell me?");

// Start fresh
onResetConversation();
onExecute({ topic: "new topic" });
```

---

### `features/prompt-apps/components/PromptAppRenderer.tsx`
**Status: ✅ Complete** *(fixed 2026-02-22)*

Same pattern as `PromptAppPublicRendererFastAPI.tsx`.
- Routes `agentStart` vs `conversationContinue` based on `dbConversationIdRef`.
- Passes `conversationId` and `onResetConversation` to dynamic custom component.

---

### `lib/redux/prompt-execution/thunks/executeMessageFastAPIThunk.ts`
**Status: N/A — stateless by design**

Hits `POST /api/ai/chat` (stateless endpoint). The client owns the full message history;
the server never fetches prior state. `conversation_id` in the body is a label only.
No conversation continuation needed here.

---

### `lib/redux/socket-io/thunks/submitChatFastAPI.ts`
**Status: N/A — stateless by design**

Legacy socket compatibility bridge. Also hits `POST /api/ai/chat`. Same as above.
This thunk is marked for removal once all callers are updated to call the new API directly.

---

## Infrastructure / Utilities

### `lib/api/stream-parser.ts` — `parseNdjsonStream()`
**Status: ✅ Updated**

Returns `{ events, requestId, conversationId }`. All callers can destructure `conversationId`
from the result — it's read directly from `response.headers.get('X-Conversation-ID')`.

### `lib/api/backend-client.ts` — `BackendClient.stream()`
**Status: ✅ Updated**

Return type now includes `conversationId: string | null`, passed through from `parseNdjsonStream`.

---

## Test / Demo Clients (Lower Priority)

These are internal tools, not user-facing. Conversation continuity is not required for them,
but they should be updated eventually so developers can test multi-turn conversations.

| File | Endpoint | Notes |
|------|----------|-------|
| `app/(public)/demos/api-tests/agent/AgentTestClient.tsx` | `agentStart` | ❌ No conv tracking |
| `app/(public)/demos/api-tests/unified-chat/ChatTestClient.tsx` | `chat` | N/A stateless |
| `app/(public)/demos/api-tests/chat/ChatDemoClient.tsx` | `chat` | N/A stateless |
| `app/(authenticated)/tests/direct-chat-test/DirectChatClient.tsx` | `chat` | N/A stateless |

**`AgentTestClient.tsx` is the only test client that needs updating** — it hits `agentStart`
but doesn't capture the conversation_id, so you can't test multi-turn agent conversations
from it. Low priority.

---

## Non-AI Domains (Not Applicable)

| File | Domain | Notes |
|------|--------|-------|
| `features/scraper/services/scraperApiService.ts` | Scraper | No conversation concept |
| `features/research/hooks/useResearchStream.ts` | Research | No conversation concept |
| `app/(public)/demos/api-tests/tool-testing/streaming-client.ts` | Tool testing | No conversation concept |

---

## Summary

| Category | Files | Action Required |
|----------|-------|----------------|
| ✅ Fully implemented | useAgentChat, PromptAppPublicRendererFastAPI, PromptAppRenderer | None |
| N/A | executeMessageFastAPIThunk, submitChatFastAPI | None — stateless /chat endpoint |
| ❌ Test client needing update | AgentTestClient | Low priority |
| N/A | Scraper, Research, Tool testing | None — different domain |
