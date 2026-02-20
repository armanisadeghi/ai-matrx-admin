# Migration Playbook: Execution Order & Checklists

> **Execute in this exact order.** Each phase has a gate — don't proceed until the gate passes.  
> **Multiple teams can work in parallel** on items within the same phase.

---

## Phase 0: Foundation — The Bridge Thunk (Day 1)

**Goal:** Build the single piece of new infrastructure needed — `executeMessageFastAPI` — so the Redux-based prompt execution system can call FastAPI instead of Socket.io without changing any consuming components.

### 0.1 Create `executeMessageFastAPIThunk.ts`

**File:** `lib/redux/prompt-execution/thunks/executeMessageFastAPIThunk.ts`

**What it does:**
1. Takes the same `chatConfig` that `executeMessage` builds (model_id, messages, stream settings)
2. Calls `/api/ai/chat/unified` with `fetch()`
3. Parses NDJSON with `parseNdjsonStream`
4. Dispatches to the **exact same Redux actions** that `submitTaskThunk` currently dispatches

**Inputs needed from `executeMessageThunk.ts`:**
- `chatConfig` object (line 198-203 of `executeMessageThunk.ts`): `{ model_id, messages, stream: true, ...promptSettings.config }`
- `taskId` (UUID generated at line 205)
- Auth token from Redux state (`selectAccessToken`)
- Backend URL from Redux state (`selectIsUsingLocalhost`)

**Redux actions to dispatch (matching `submitTaskThunk.ts` behavior):**
```
socketResponseSlice.addResponse({ listenerId: taskId })
socketTasksSlice.setTaskListenerIds({ taskId, listenerIds: [taskId] })
socketTasksSlice.setTaskStreaming({ taskId, isStreaming: true })

// Per stream event:
chunk        → socketResponseSlice.appendTextChunk({ listenerId: taskId, chunk: text })
error        → socketResponseSlice.updateErrorResponse({ listenerId: taskId, data })
tool_event   → socketResponseSlice.updateToolUpdateResponse({ listenerId: taskId, data })
broker       → brokerActions.setValue({ brokerId, value })
end          → socketResponseSlice.markResponseEnd({ listenerId: taskId })
completion   → socketResponseSlice.markResponseEnd({ listenerId: taskId }) + socketTasksSlice.completeTask({ taskId })
```

**Critical:** Use `appendTextChunk` (not `updateTextResponse`) for streaming text. The socket path uses chunk-based accumulation for performance — `selectCombinedText` handles concatenation in the selector.

**Test:** Verify the existing selectors return correct data:
- `selectPrimaryResponseTextByTaskId(state, taskId)` should return accumulated text
- `selectPrimaryResponseEndedByTaskId(state, taskId)` should return `true` when stream ends

### 0.2 Add Flag to `executeMessageThunk.ts`

**File:** `lib/redux/prompt-execution/thunks/executeMessageThunk.ts`

**Change at line 208-214:**
```typescript
// Before:
const apiPromise = dispatch(createAndSubmitTask({
  service: 'chat_service',
  taskName: 'direct_chat',
  taskData: { chat_config: chatConfig },
  customTaskId: taskId,
}));

// After:
const USE_FASTAPI = true; // Migration flag — set false to revert

let apiPromise;
if (USE_FASTAPI) {
  apiPromise = dispatch(executeMessageFastAPI({
    chatConfig,
    taskId,
    runId,
  }));
} else {
  apiPromise = dispatch(createAndSubmitTask({
    service: 'chat_service',
    taskName: 'direct_chat',
    taskData: { chat_config: chatConfig },
    customTaskId: taskId,
  }));
}
```

### 0.3 Test the Bridge

- [ ] Open `/ai/prompts`, select a prompt, run it
- [ ] Verify text streams in the same UI components
- [ ] Verify streaming text appears progressively (not all at once)
- [ ] Verify the run completes and `selectIsResponseEndedForInstance` returns `true`
- [ ] Verify DB save still works (the fire-and-forget `saveRunToDBAsync` should be unaffected)
- [ ] Toggle `USE_FASTAPI` to `false` and verify socket.io still works
- [ ] Check no console errors from the socket system (it should simply not be called)

### Phase 0 Gate
- [ ] `executeMessageFastAPI` works end-to-end
- [ ] All existing prompt execution UI components render correctly
- [ ] Flag toggle switches cleanly between FastAPI and Socket.io
- [ ] No socket.io calls made when flag is `true`

---

## Phase 1: Instant Win — Public Prompt Apps (Day 1, parallel with Phase 0)

**Goal:** Switch `/p/[slug]` from socket.io to the already-existing FastAPI renderer.

**This is the fastest migration possible — the code already exists.**

### 1.1 Switch `p/[slug]` to FastAPI Renderer

**File:** `app/(public)/p/[slug]/page.tsx` (or wherever `PromptAppPublicRenderer` is imported)

**Action:** Find the import of `PromptAppPublicRenderer` and replace with `PromptAppPublicRendererFastAPI`:

```typescript
// Before:
import { PromptAppPublicRenderer } from '@/features/prompt-apps/components/PromptAppPublicRenderer';

// After:
import { PromptAppPublicRendererFastAPI as PromptAppPublicRenderer } from '@/features/prompt-apps/components/PromptAppPublicRendererFastAPI';
```

If the props differ, check both component interfaces — they should be compatible. The FastAPI version accepts `{ app, slug }` same as the socket version.

### 1.2 Test
- [ ] Visit `/p/{any-slug}` — verify prompt app loads
- [ ] Execute a prompt app — verify streaming works
- [ ] Check guest limit still works
- [ ] Check authenticated user execution still works
- [ ] Verify no socket.io console activity

### Phase 1 Gate
- [ ] All public prompt apps at `/p/[slug]` run through FastAPI
- [ ] No socket.io connections initiated for public prompt pages
- [ ] Guest limit + auth flow unchanged

---

## Phase 2: Authenticated Prompt Apps (Day 2)

**Goal:** Migrate the authenticated prompt app renderer from socket.io to FastAPI.

### 2.1 Update `PromptAppRenderer.tsx`

**File:** `features/prompt-apps/components/PromptAppRenderer.tsx`

**Action:** Replace the socket.io execution logic with the FastAPI pattern from `PromptAppPublicRendererFastAPI.tsx`.

The key differences between authenticated and public:
- Authenticated always has a JWT token (via `useApiAuth`)
- No guest limit needed
- No fingerprint needed
- May need to maintain some Redux state for the authenticated shell

**Pattern to follow:** Lines 150-343 of `PromptAppPublicRendererFastAPI.tsx` — the `handleExecute` function.

### 2.2 Test
- [ ] Visit `/prompt-apps`, open an app, execute it
- [ ] Verify streaming response appears
- [ ] Verify the app list page still works
- [ ] Check run history/tracking

### Phase 2 Gate
- [ ] Authenticated prompt apps run via FastAPI
- [ ] No socket.io calls from `/prompt-apps` route

---

## Phase 3: Scraper (Day 2-3)

**Goal:** Replace `useScraperSocket` with a FastAPI-based hook.

### 3.1 Create `useScraperApi` Hook

**File:** `features/scraper/hooks/useScraperApi.ts`

**Pattern:** Use `useBackendApi` for URL + auth. Call `ENDPOINTS.scraper.*` endpoints.

```typescript
import { useBackendApi } from '@/hooks/useBackendApi';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { parseNdjsonStream } from '@/lib/api/stream-parser';

export function useScraperApi() {
  const api = useBackendApi();
  
  const quickScrape = async (url: string) => {
    const response = await api.post(ENDPOINTS.scraper.quickScrape, { url });
    // If streaming: return parseNdjsonStream(response)
    // If JSON: return response.json()
  };
  
  // ... other methods
}
```

### 3.2 Update Scraper Page Components

Replace all `useScraperSocket` usage with `useScraperApi`.

### 3.3 Test
- [ ] Quick scrape a URL
- [ ] Full search and scrape
- [ ] Verify streaming progress (if applicable)

### Phase 3 Gate
- [ ] Scraper works without socket.io
- [ ] All scraper actions go through FastAPI endpoints

---

## Phase 4: Prompt Builder Generation (Day 3)

**Goal:** Migrate the prompt generation feature inside the prompt builder (uses socket.io directly).

### 4.1 Update `PromptBuilder.tsx`

**File:** `features/prompts/components/builder/PromptBuilder.tsx`

This component calls `createAndSubmitTask` directly for prompt generation (different from prompt execution).

**Action:** Replace with FastAPI call. This is likely an agent or chat call — determine whether it calls a specific builtin or packages raw messages.

### 4.2 Update `PromptGenerator.tsx`

**File:** `features/prompts/components/actions/prompt-generator/PromptGenerator.tsx`

Same pattern — uses `createAndSubmitTask` for generating prompts from descriptions.

### Phase 4 Gate
- [ ] Prompt generation in builder works via FastAPI
- [ ] Generated prompt content streams correctly

---

## Phase 5: Canvas (Day 3-4)

**Goal:** Migrate canvas AI generation from socket.io to FastAPI.

### 5.1 Audit Canvas AI Calls

**Directory:** `features/canvas/`

Find every point where a socket task is created for AI-generated canvas content. These will be `createAndSubmitTask` or direct socket emit calls.

### 5.2 Replace with FastAPI Calls

Use `/api/ai/agent/execute` or `/api/ai/chat/unified` depending on whether the canvas uses a prompt or raw messages.

### Phase 5 Gate
- [ ] Canvas AI generation works via FastAPI
- [ ] Canvas rendering unchanged

---

## Phase 6: Cleanup & Consolidation (Days 4-5)

### 6.1 Remove Socket.io from `executeMessageThunk.ts`

Once Phase 0 is verified in production:
- Remove the `USE_FASTAPI` flag
- Remove the `createAndSubmitTask` import and code path
- Keep `executeMessageFastAPI` as the only path

### 6.2 Kill Public Socket.io

Once Phases 1-2 are verified:
- Remove `PromptAppPublicRenderer.tsx` (old socket version)
- Remove socket.io lazy import from the old renderer
- Clean up any socket connection logic from public routes

### 6.3 Verify Deferred Routes Still Work

Confirm these routes still function on socket.io:
- [ ] `/ai/cockpit`
- [ ] `/ai/recipes`
- [ ] `/applets`
- [ ] `/apps`
- [ ] `/chat`

`SocketInitializer` in the authenticated layout must remain active for these.

---

## Parallel Work Assignment Guide

Teams can work in parallel on these independent tracks:

| Track | Phases | Dependencies |
|---|---|---|
| **Track A: Bridge Thunk** | Phase 0 | None — foundational |
| **Track B: Public Prompt Apps** | Phase 1 | None — just swaps an import |
| **Track C: Authenticated Prompt Apps** | Phase 2 | Phase 0 (for Redux-integrated path) or independent (if using local state) |
| **Track D: Scraper** | Phase 3 | None — independent feature |
| **Track E: Prompt Builder** | Phase 4 | Phase 0 (needs bridge thunk or similar pattern) |
| **Track F: Canvas** | Phase 5 | None — independent feature |

---

## Emergency Rollback Plan

If any migration breaks production:

1. **Bridge Thunk (Phase 0):** Set `USE_FASTAPI = false` in `executeMessageThunk.ts`
2. **Public Prompt Apps (Phase 1):** Revert the import in `p/[slug]/page.tsx` back to `PromptAppPublicRenderer`
3. **Any other route:** Revert the specific file changes

Socket.io infrastructure remains intact throughout the migration. Rollback is always a one-line flag change or import revert.

---

## Final Checklist: Route Migration Complete

Apply this to every route before marking it done:

- [ ] No `socket.emit` calls in the route's component tree
- [ ] No `createAndSubmitTask` dispatches on the user-facing path
- [ ] No `useScraperSocket` or direct socket hook usage
- [ ] All AI calls go through FastAPI endpoints (`/api/ai/chat/unified` or `/api/ai/agent/execute`)
- [ ] Streaming works: first token < 2s, full response completes cleanly
- [ ] Tools render correctly during stream (if applicable)
- [ ] Abort/cancel works: user can stop mid-stream
- [ ] No socket.io console messages for this route
- [ ] Old socket path is still intact but unreachable (parallel path flag set to FastAPI)
- [ ] Lazy loading maintained: submission logic not loaded until user initiates action

---

## Files NOT to Touch During 2-Week Window

These serve deferred routes and must remain functional:

- `lib/redux/socket-io/connection/SocketInitializer.tsx` — Used in `app/(authenticated)/layout.tsx`
- `lib/redux/socket-io/connection/socketConnectionManager.ts` — Connection singleton
- `lib/redux/socket-io/connection/socketMiddleware.ts` — Redux middleware registration
- `lib/redux/socket-io/slices/*.ts` — All three socket slices (connections, tasks, response)
- `lib/redux/socket-io/thunks/submitTaskThunk.ts` — Keep for deferred routes
- `constants/socket-constants.ts` / `constants/socket-schema.ts` — Task schemas
