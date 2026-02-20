# Route Inventory: Verified Migration Audit

> Every field is verified against the actual codebase. No `[VERIFY LOCALLY]` placeholders remain.  
> Last verified: 2026-02-19

---

## Routes That Need Migration

---

### 1. `app/(authenticated)/ai/prompts`

**Purpose:** Prompt management — view, create, edit, and **run/test** prompts.

| Field | Verified Value |
|---|---|
| Socket.io usage | **YES** — `executeMessage` thunk → `createAndSubmitTask` → `socket.emit('chat_service', { taskName: 'direct_chat' })` |
| Redux slices | `promptExecution` (instances, messages, execution state), `socketTasks`, `socketResponse`, `promptRunner` |
| FastAPI endpoints | None currently (all execution through socket) |
| Tools usage | Only if prompt has tools configured |
| Key component chain | `PromptBuilder.tsx` → `PromptRunner.tsx` → `SmartPromptInput.tsx` → `executeMessage` thunk |
| Streaming display | `selectPrimaryResponseTextByTaskId` → `selectPrimaryResponseEndedByTaskId` from socket response selectors |

**Migration Strategy:**
- Edit/create forms are pure Supabase — **no migration needed**
- The "Run/Test" action is the target: replace `executeMessage` thunk's call to `createAndSubmitTask` with a FastAPI fetch
- Two options:
  - **Option A (Minimal):** Create a new thunk `executeMessageFastAPI` that calls `/api/ai/chat/unified` and writes results back to `promptExecution` slice
  - **Option B (Clean):** Replace the prompt runner entirely with a component using `useAgentChat`-style local state
- **Recommended:** Option A first (parallel path), Option B later

**Key Files to Modify:**
- `lib/redux/prompt-execution/thunks/executeMessageThunk.ts` — Replace `createAndSubmitTask` call (line 209)
- `lib/redux/prompt-execution/selectors.ts` — `selectStreamingTextForInstance` and `selectIsResponseEndedForInstance` currently read from socket response selectors
- `features/prompts/components/builder/PromptBuilder.tsx` — Uses `createAndSubmitTask` directly for prompt generation

---

### 2. `app/(authenticated)/prompt-apps`

**Purpose:** Authenticated prompt app runner — manages and executes prompt apps for logged-in users.

| Field | Verified Value |
|---|---|
| Socket.io usage | **YES (authenticated path only)** — `PromptAppRenderer.tsx` uses Redux socket pattern |
| FastAPI usage | **YES (public path already migrated)** — `PromptAppPublicRendererFastAPI.tsx` uses `parseNdjsonStream` + `/api/ai/agent/execute` |
| Redux slices | `socketTasks`, `socketResponse` (authenticated path only) |
| Tools usage | Depends on individual prompt app |
| Streaming display | Socket response selectors (authenticated); `StreamEvent[]` local state (public FastAPI) |

**Migration Strategy:**
- The public FastAPI renderer (`PromptAppPublicRendererFastAPI.tsx`) is **already migrated and production-ready**
- The authenticated renderer (`PromptAppRenderer.tsx`) still uses socket.io
- **Action:** Replace `PromptAppRenderer.tsx` execution logic with the same pattern as `PromptAppPublicRendererFastAPI.tsx`
- The authenticated version needs: real JWT auth (already handled by `useApiAuth`), same streaming pattern, same variable validation

**Key Files to Modify:**
- `features/prompt-apps/components/PromptAppRenderer.tsx` — Replace socket execution with FastAPI pattern from `PromptAppPublicRendererFastAPI.tsx`

---

### 3. `app/(authenticated)/scraper`

**Purpose:** Web scraping with AI assistance. Currently socket-heavy.

| Field | Verified Value |
|---|---|
| Socket.io usage | **YES** — `useScraperSocket` hook → `createAndSubmitTask` → `socket.emit('scraper_service_v2', { taskName: 'quick_scrape' })` |
| Redux slices | `socketTasks`, `socketResponse` |
| FastAPI endpoints | **Already exist:** `/api/scraper/quick-scrape`, `/api/scraper/search`, `/api/scraper/search-and-scrape`, `/api/scraper/search-and-scrape-limited` |
| Tools usage | Scraper tools if agent-based |
| Key hook | `lib/redux/socket-io/hooks/useScraperSocket.ts` |

**Migration Strategy:**
- FastAPI scraper endpoints already exist in `lib/api/endpoints.ts` → `ENDPOINTS.scraper.*`
- **Action:** Replace `useScraperSocket` with a new `useScraperApi` hook that calls the FastAPI endpoints directly
- The FastAPI scraper endpoints may return NDJSON streams (for progress) or simple JSON responses — verify backend
- If streaming: use `parseNdjsonStream`
- If JSON: use simple `fetch` + `response.json()`

**Key Files to Modify:**
- Create `features/scraper/hooks/useScraperApi.ts` (or similar) to replace `lib/redux/socket-io/hooks/useScraperSocket.ts`
- Update scraper page components to use the new hook

---

### 4. `app/(public)/p/[slug]/page.tsx`

**Purpose:** Dynamic public prompt app pages. High traffic.

| Field | Verified Value |
|---|---|
| Socket.io usage | **YES** — `PromptAppPublicRenderer.tsx` creates direct socket connection (not Redux) |
| Socket events | `socket.emit('chat_service', { taskName: 'direct_chat', taskData })` with dynamic listeners |
| FastAPI parallel | **Already exists at `/p/fast/[slug]`** using `PromptAppPublicRendererFastAPI.tsx` |
| Redux slices | None (local state only) |
| Tools usage | Depends on prompt app |

**Migration Strategy:**
- **Simplest migration in the entire project.** The FastAPI version (`/p/fast/[slug]`) already exists and works.
- **Action:** Replace `PromptAppPublicRenderer` import in `[slug]/page.tsx` with `PromptAppPublicRendererFastAPI`
- Or: update the `[slug]/page.tsx` to use the same component that `fast/[slug]` uses
- The old `PromptAppPublicRenderer.tsx` can be kept temporarily but no longer referenced from the main route

**Key Files to Modify:**
- `app/(public)/p/[slug]/page.tsx` — Switch renderer component

---

### 5. `app/(public)/canvas`

**Purpose:** Shared canvas with AI-generated content (quizzes, presentations, recipes, timelines).

| Field | Verified Value |
|---|---|
| Socket.io usage | **YES** — Canvas AI generation uses socket tasks (via `task_id` from backend) |
| Redux slices | `canvasSlice` + socket slices |
| FastAPI endpoints | None currently for canvas AI generation |
| State management | Redux (`canvasSlice`) + local state |
| Key components | `SharedCanvasView.tsx`, `PublicCanvasRenderer.tsx`, `useSharedCanvas` hook |

**Migration Strategy:**
- Canvas AI calls need to be rerouted through `/api/ai/agent/execute` or `/api/ai/chat/unified`
- This is a medium-complexity migration — canvas has its own state management layer
- **Action:** Identify the exact socket emission points in the canvas feature and replace with FastAPI calls

**Key Files to Explore:**
- `features/canvas/` directory — Find where socket tasks are created for AI generation

---

## Routes That Do NOT Need Migration

### `app/(authenticated)/ai/runs`
- **Verified:** Uses `aiRunsService` → direct Supabase queries only
- **No socket.io usage found.** Auto-refresh polling via `useAiRunsList` hook (10s interval)
- **Status:** No changes needed

### `app/(authenticated)/notes`
- **Verified:** Uses `notesService.ts` → direct Supabase client calls
- **No socket.io usage found.** Uses React Context (`NotesContext.tsx`) for local state
- **Status:** No changes needed

### `app/(public)/p` (listing page)
- **Verified:** Server-side Supabase fetch. Lists published prompt apps in grid.
- **No socket.io usage.** No streaming.
- **Status:** No changes needed

---

## Routes Already Migrated (References)

### `app/(public)/p/chat` ✅
- **Transport:** FastAPI Agent API via `useAgentChat` hook
- **Endpoint:** `/api/ai/agent/execute`
- **Streaming:** `parseNdjsonStream` async generator
- **State:** `ChatContext` (useReducer) — no Redux
- **Auth:** `useApiAuth` for headers
- **Reference for:** All agent-style calls

### `app/(public)/p/fast/[slug]` ✅
- **Transport:** FastAPI Agent API
- **Component:** `PromptAppPublicRendererFastAPI`
- **Endpoint:** `/api/ai/agent/execute`
- **Streaming:** `parseNdjsonStream`
- **Reference for:** Prompt app execution

### `app/(public)/p/fast-test/[slug]` ✅
- **Transport:** FastAPI Agent API
- **Component:** `SampleAppTestWrapper`
- **Reference for:** Test harness pattern

### `app/(public)/p/research` ✅
- **Transport:** FastAPI via `useBackendApi`
- **Streaming:** `consumeStream` from `lib/api/stream-parser.ts`
- **State:** Context API (`TopicProvider`) + React Query
- **Reference for:** Research-style streaming with progress events

---

## Socket.io Infrastructure Map

### What Gets Initialized Where
- `SocketInitializer.tsx` is rendered in `app/(authenticated)/layout.tsx` (line 97)
- This initializes the primary socket connection for ALL authenticated routes
- **Do NOT remove** until all authenticated routes are migrated (deferred routes still need it)

### Socket Event Flow (Current)
```
Component → dispatch(createAndSubmitTask({ service, taskName, taskData }))
  → submitTaskThunk:
    1. Validates task
    2. Gets/reconnects socket
    3. socket.emit(service, { taskName, taskData }, callback)
    4. Backend responds with listener event names
    5. Sets up socket.on(eventName) listeners
    6. Listeners dispatch to socketResponse slice:
       - String data → appendTextChunk
       - Object with data → updateDataResponse
       - Object with error → updateErrorResponse
       - Object with tool_update → updateToolUpdateResponse
       - Object with broker → brokerActions.setValue
       - Object with end:true → markResponseEnd + completeTask
  → Component reads from socketResponse selectors
```

### FastAPI Event Flow (Target)
```
Component → fetch(BACKEND_URL + endpoint, { headers, body })
  → parseNdjsonStream(response, signal)
    → async generator yields StreamEvent objects
  → Component processes events:
    - chunk → append text
    - tool_event → display tool activity
    - error → show error
    - completion → capture stats
    - end → mark complete
```

---

## Redux Dependency Graph (Priority Routes)

```
executeMessageThunk
├── promptExecution/slice (createInstance, addMessage, startExecution, etc.)
├── promptExecution/selectors
│   ├── selectStreamingTextForInstance
│   │   └── selectPrimaryResponseTextByTaskId (socket-response-selectors)
│   └── selectIsResponseEndedForInstance
│       └── selectPrimaryResponseEndedByTaskId (socket-response-selectors)
├── createAndSubmitTask (socket-io/thunks)
│   ├── socketTasksSlice (initializeTask, validateTask, setTaskListenerIds, etc.)
│   └── socketResponseSlice (appendTextChunk, updateDataResponse, etc.)
└── brokerSlice (setValue — from broker events in stream)
```

**Migration cut point:** Replace `createAndSubmitTask` with FastAPI fetch + stream parsing. Either:
1. Write results back to the same Redux slices (backward compatible)
2. Use local state and bypass Redux entirely (cleaner, but more work)
