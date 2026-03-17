# Unified Conversation System — Audit & Migration Plan

> **Status as of 2026-03-17 (dev branch `aa1f584f`)**
> All infrastructure has been created. **No route has been migrated yet.**
> This document is the single source of truth for what exists, what is used, and what needs to happen.

---

## 1. What Was Built (Infrastructure Layer)

### 1a. Shared UI Components — `components/conversation/`

These components form the unified UI layer. They are wired to each other internally but **no route page consumes them yet**.

| File | Purpose | External Consumers |
|------|---------|-------------------|
| `components/conversation/ConversationShell.tsx` | Top-level layout wrapper — MessageList + ConversationInput + optional canvas | **None** (only referenced in comments) |
| `components/conversation/MessageList.tsx` | Renders all messages with per-message ErrorBoundary and auto-scroll | `ConversationShell` only |
| `components/conversation/AssistantMessage.tsx` | Full-featured assistant message: 3 content modes, Cartesia TTS, ThumbsUp/Down, PDF export, HTML preview | `MessageList` only |
| `components/conversation/UserMessage.tsx` | User message: XML resource parsing, structured resource display, collapse, inline edit | `MessageList` only |
| `components/conversation/MessageOptionsMenu.tsx` | 14-item auth-aware action menu with AuthGateDialog, EmailInputDialog | Lazy-loaded by `AssistantMessage` only |
| `components/conversation/StreamingContentBlocks.tsx` | NDJSON stream: interleaved text + tool call blocks → `MarkdownStream` + `ToolCallVisualization` | `AssistantMessage` only |
| `components/conversation/ToolCallVisualization.tsx` | Tool call progress + results renderer with registry | `AssistantMessage`, `StreamingContentBlocks`, `ChatStreamDisplay` (production), shim re-export |
| `components/conversation/MessageErrorBoundary.tsx` | Class-based error boundary isolating per-message crashes | `MessageList` only |
| `components/conversation/index.ts` | Barrel export for all above | N/A |

**Key takeaway:** `ToolCallVisualization` is the only component in this folder already used in production (via `ChatStreamDisplay.tsx`). Everything else is internal to the `components/conversation/` tree only.

---

### 1b. Redux Slice — `lib/redux/chatConversations/`

The new canonical state for all conversation UIs. Registered in `rootReducer.ts`.

| File | Purpose | Currently Used By |
|------|---------|------------------|
| `lib/redux/chatConversations/types.ts` | `ConversationMessage`, `ConversationSession`, `ChatConversationsState`, all payload types | `components/conversation/*`, adapter hooks |
| `lib/redux/chatConversations/slice.ts` | Reducers: startSession, addMessage, appendStreamChunk, pushStreamEvent, updateVariable, etc. | `components/conversation/*`, adapter hooks, `rootReducer` |
| `lib/redux/chatConversations/selectors.ts` | Memoized selectors: selectMessages, selectIsStreaming, selectCurrentInput, etc. | `components/conversation/*`, adapter hooks |
| `lib/redux/chatConversations/thunks/sendMessage.ts` | NDJSON streaming thunk — hits `/agents/{id}` or `/conversations/{id}` | `components/conversation/ConversationInput` only |
| `lib/redux/chatConversations/thunks/loadConversationHistory.ts` | Loads conversation history from `/api/ai/conversations/{id}/messages` | Not yet called by any route |
| `lib/redux/chatConversations/index.ts` | Barrel export | `rootReducer`, `components/conversation/*` |

---

### 1c. Tool Renderer Registry — `lib/tool-renderers/`

Moved from `features/chat/components/response/tool-renderers/`. The old path is now a set of `@deprecated` re-export shims.

| Location | Status | Direct Consumers |
|----------|--------|-----------------|
| `lib/tool-renderers/` | **Canonical (new)** | `components/conversation/ToolCallVisualization` |
| `features/chat/components/response/tool-renderers/` | **Deprecated shims** (re-export from `lib/tool-renderers`) | `ChatStreamDisplay`, `EnhancedChatMarkdown`, demo pages, admin tools |

The production code (`ChatStreamDisplay`, etc.) reaches `lib/tool-renderers` **through the shims** — it still works but should eventually update its import paths directly.

---

### 1d. Adapter Hooks (Transition Layer)

These hooks bridge legacy state into `chatConversations` slice. They enable gradual migration without rewriting the backend.

| File | Purpose | Currently Used By |
|------|---------|------------------|
| `features/prompts/hooks/usePromptExecutionAdapter.ts` | Reads `prompt-execution` Redux slice, mirrors messages/streaming into `chatConversations` | Only by `usePromptBuilderAdapter` |
| `features/prompts/hooks/usePromptBuilderAdapter.ts` | Wraps `usePromptExecutionAdapter` for prompt edit context | **Nobody — zero consumers** |
| `features/chat/hooks/useSocketIoSessionAdapter.ts` | Reads socket-io selectors, pushes chunks into `chatConversations` for `/chat` route | **Nobody — zero consumers** |

---

### 1e. Deprecated Legacy Files (tagged but still in production)

| File | Deprecated Comment | Still Used By |
|------|--------------------|--------------|
| `features/prompts/components/results-display/PromptRunner.tsx` | ✅ yes | `features/prompts/components/PromptRunPage.tsx` — **active production** |
| `features/prompts/components/smart/SmartMessageList.tsx` | ✅ yes | `PromptRunner.tsx` — **active production** |
| `features/prompts/components/smart/SmartPromptInput.tsx` | ✅ yes | `PromptRunner.tsx` — **active production** |
| `features/chat/components/response/user-message/UserMessage.tsx` | ✅ yes | `features/chat/components/response/ResponseColumn.tsx` — **active production** |

---

## 2. What Each Route Currently Uses (No Changes Made Yet)

### Route Map

| Route | URL | Messages Component | Input Component | State Layer | Top Container |
|-------|-----|--------------------|-----------------|-------------|---------------|
| Public Chat | `/p/chat` | `MessageList` in `MessageDisplay.tsx` | `ChatInputWithControls` | `ChatContext` (useReducer) | `ChatLayoutShell` → `ChatContainer` |
| SSR Chat | `/ssr/chat` | `MessageList` in `MessageDisplay.tsx` | `ChatInputWithControls` | `ChatContext` + `SsrAgentContext` | `ChatLayout` → `ChatWorkspace` |
| Auth Chat | `/chat` | `ResponseColumn` → `MessageItem` | `PromptInputContainer` | Redux `chatConversations` slice (old) + socket-io | `ChatLayoutClient` |
| Prompts Run | `/ai/prompts/run` | `SmartMessageList` | `SmartPromptInput` | Redux `promptExecution` slice | `PromptRunPage` → `PromptRunner` |
| Prompts Edit | `/ai/prompts/edit` | `PromptUserMessage`/`PromptAssistantMessage` | `PromptInput` | Local state + Redux socket-io | `PromptBuilder` → `PromptBuilderDesktop` |
| SSR Prompts | `/ssr/prompts/run` | `SmartMessageList` (same as run) | `SmartPromptInput` (same as run) | Redux `promptExecution` slice | `PromptRunPage` (shared component) |

### Unique Features Per Route (must preserve during migration)

| Route | Unique Features |
|-------|----------------|
| `/p/chat` | `AgentPickerSheet`, `ChatSidebar` with conversation history, `ChatMobileHeader`, URL patterns `/p/chat/c/[id]` + `/p/chat/a/[agentId]`, `GuidedVariableInputs` on welcome screen |
| `/ssr/chat` | CSS-grid layout system, `SsrAgentContext`, `ShareModal`, `ChatHeaderControls`, URL via `window.history.pushState`, `CustomEvent` for sidebar sync |
| `/chat` | Full socket-io pipeline, `InputBottomControls` (broker/tools/search toggles), `BrokerSheet`, `AIToolsSheet`, `FileUploadWithStorage`, model picker, debug overlay, TTS |
| `/ai/prompts/run` | `PromptRunsSidebar` (run history), `ResizableCanvas` side panel, `PromptModeNavigation` (Edit/Run toggle), `SharedPromptBanner`, run ID in URL |
| `/ai/prompts/edit` | **Full prompt builder left panel** (system message, variable editor, tool selector, model config, `FullScreenEditor`, `ModelSettingsDialog`, `SystemPromptOptimizer`) — right panel is just a test preview |
| `/ssr/prompts/run` | Same as `/ai/prompts/run` but inside SSR shell; `usePromptsBasePath()` for correct back navigation |

---

## 3. Migration Plan

### Relocation: `components/conversation/` → `features/conversation/`

Per project rules, all feature-level code must live in a `features/[name]/` directory, not scattered in top-level `components/`. The entire `components/conversation/` tree must move.

**Target structure:**
```
features/conversation/
├── components/
│   ├── ConversationShell.tsx
│   ├── MessageList.tsx
│   ├── AssistantMessage.tsx
│   ├── UserMessage.tsx
│   ├── MessageOptionsMenu.tsx
│   ├── StreamingContentBlocks.tsx
│   ├── ToolCallVisualization.tsx      ← was also in features/chat (now deprecated shim)
│   └── MessageErrorBoundary.tsx
├── hooks/
│   ├── useSocketIoSessionAdapter.ts   ← move from features/chat/hooks/
│   ├── usePromptExecutionAdapter.ts   ← move from features/prompts/hooks/
│   └── usePromptBuilderAdapter.ts     ← move from features/prompts/hooks/
├── redux/                             ← move from lib/redux/chatConversations/
│   ├── types.ts
│   ├── slice.ts
│   ├── selectors.ts
│   ├── index.ts
│   └── thunks/
│       ├── sendMessage.ts
│       └── loadConversationHistory.ts
├── index.ts                           ← barrel export for everything
└── README.md                          ← this file (updated post-migration)
```

> **Note on `lib/tool-renderers/`:** Tool renderers are a shared library used by multiple features (chat, conversation, admin tools). They should stay in `lib/tool-renderers/` — that is an appropriate location for shared, feature-agnostic code. Update `features/chat/components/response/tool-renderers/` shim imports directly to `@/lib/tool-renderers` over time.

---

### Migration Order (least risky → most complex)

#### Step 1 — Move the files to `features/conversation/`

Move all files, update all internal imports, update `rootReducer.ts` import path, verify TypeScript passes.

No route changes yet. Pure refactor.

#### Step 2 — Migrate `/ai/prompts/run` and `/ssr/prompts/run`

**Why first:** `usePromptExecutionAdapter` is already written for this. The adapter hook bridges `promptExecution` slice → `chatConversations` slice so `ConversationShell` can render without rewriting the execution engine.

**What to change in `PromptRunPage.tsx`:**
1. Import `usePromptExecutionAdapter` and call it with `runId` and `agentId` after `startPromptInstance` completes
2. Replace `<PromptRunner runId={runId} />` with `<ConversationShell sessionId={runId} enableInlineCanvas={true} inputProps={{ showVariables: true, showSubmitOnEnterToggle: true }} />`
3. Keep `PromptRunsSidebar`, `PromptModeNavigation`, `SharedPromptBanner` — these are layout concerns, not conversation panel concerns

**What stays untouched:** `startPromptInstance` thunk, `executeMessage` thunk, `finalizeExecution` thunk, `PromptRunsSidebar`, `CanvasRenderer` wiring

**Risk:** Medium — adapter writes to both slices simultaneously. If streaming text drift occurs, messages will show stale content.

#### Step 3 — Migrate `/ai/prompts/edit`

**What to change in `PromptBuilder.tsx` / `PromptBuilderDesktop.tsx`:**
1. Replace `PromptBuilderRightPanel` + `PromptInput` + local `messages` state with a `ConversationShell` session initialized via `startConversation` thunk
2. Wire `usePromptBuilderAdapter` (needs to be fully implemented — currently it just wraps `usePromptExecutionAdapter`)
3. Remove the `sharedProps` object passed through 17 levels of prop drilling
4. Keep the entire left panel (`PromptBuilderLeftPanel`) unchanged

**What stays untouched:** System message editor, variable defaults editor, tool selector, model settings, `FullScreenEditor`, `ModelSettingsDialog`, `SystemPromptOptimizer`

**Risk:** Medium-High — the test preview conversation must stay ephemeral (no DB persistence on save). Ensure `startConversation` thunk doesn't write to DB on first message for this context.

#### Step 4 — Migrate `/chat`

**What to change in `ChatLayoutClient.tsx` / `ChatConversationView.tsx`:**
1. Initialize a `chatConversations` session via `startConversation` on first message
2. Replace `ResponseColumn` with `ConversationShell`'s `MessageList` (or `ConversationShell` itself)
3. Keep `InputBottomControls` for now (broker/tools/search toggles not yet in `ConversationInput`)
4. Wire `useSocketIoSessionAdapter` — this is already written, just needs to be consumed
5. Retire `features/chat/components/response/user-message/UserMessage.tsx` (currently deprecated)

**Risk:** High — socket-io streaming is complex. The adapter must correctly mirror chunks. Test streaming extensively before committing.

#### Step 5 — Migrate `/p/chat`

**What to change:**
1. Add `chatConversations` session initialization to `ChatLayoutShell` or `ChatContainer`
2. Replace `MessageList` (in `MessageDisplay.tsx`) with `features/conversation/components/MessageList`
3. Replace `ChatInputWithControls` with `ConversationInput` (`showAgentPicker=true`, `showVoice=true`, `showResourcePicker=true`)
4. Keep `ChatContext` for sidebar/agent selection state (it's not just conversation state)
5. Keep `AgentPickerSheet`, `ChatSidebar`, `ChatMobileHeader`
6. `GuidedVariableInputs` / `PublicVariableInputs` → migrate to `showVariables=true` on `ConversationInput`

**Risk:** High — `ChatContext` owns both conversation state AND sidebar/agent-picker state. Must carefully split what moves to Redux (`chatConversations`) vs what stays in context (agent selection, sidebar open state).

#### Step 6 — Migrate `/ssr/chat`

Same as `/p/chat` — shares `ChatContext`, `ChatInputWithControls`, `MessageDisplay.tsx`. The differences are layout (CSS grid vs flex), `SsrAgentContext` (keep it), `ShareModal` (keep it), and URL sync strategy (`window.history.pushState` vs `router.replace`).

**Risk:** High — same as `/p/chat`. Do this immediately after Step 5 since the same components are being replaced.

---

### Do Not Break Checklist

Before each migration step, verify:

- [ ] `ToolCallVisualization` phase-driven spinners work (canonical block protocol, not positional inference)
- [ ] `MarkdownStream` receives correct session/task ID for streaming cursor
- [ ] `HtmlPreviewFullScreenEditor` opens from message options with all 6 tabs
- [ ] `FullScreenMarkdownEditor` saves content back to Redux message
- [ ] `ResourcesContainer` renders table, image, note, task resources correctly
- [ ] `AttachedResourcesDisplay` shows image thumbnails in user messages
- [ ] Variable inputs (guided + classic modes) visible when agent has variables
- [ ] Canvas inline mode works in prompts/run
- [ ] Auth-gating works in public routes (sessionStorage pending action survives navigation)
- [ ] `MessageErrorBoundary` wraps each message individually (no cascade failures)
- [ ] `useDomCapturePrint` `captureRef` correctly wraps `MarkdownStream` for PDF export
- [ ] Mobile: no nested scroll, `pb-safe` on input, font-size ≥ 16px on textarea
- [ ] No `window.confirm()` calls anywhere in migrated paths

---

## 4. Files Safe to Modify (No External Consumers)

These files are new and only consumed internally within `components/conversation/`. Changing them has **zero risk of breaking any currently working route**:

- `components/conversation/ConversationShell.tsx`
- `components/conversation/MessageList.tsx`
- `components/conversation/AssistantMessage.tsx`
- `components/conversation/UserMessage.tsx`
- `components/conversation/MessageOptionsMenu.tsx`
- `components/conversation/StreamingContentBlocks.tsx`
- `components/conversation/MessageErrorBoundary.tsx`
- `components/conversation/index.ts`
- `lib/redux/chatConversations/` (entire directory — not yet called by any route)
- `features/prompts/hooks/usePromptExecutionAdapter.ts` (only called by `usePromptBuilderAdapter`, which itself has zero consumers)
- `features/prompts/hooks/usePromptBuilderAdapter.ts` (zero consumers)
- `features/chat/hooks/useSocketIoSessionAdapter.ts` (zero consumers)

---

## 5. Files With Active Consumers — Change With Care

These files are in production. Any modification must be backward-compatible or accompanied by a full test of the affected route.

| File | Used By (Routes) |
|------|-----------------|
| `features/prompts/components/results-display/PromptRunner.tsx` | `/ai/prompts/run`, `/ssr/prompts/run` |
| `features/prompts/components/smart/SmartMessageList.tsx` | `PromptRunner.tsx` → both prompts/run routes |
| `features/prompts/components/smart/SmartPromptInput.tsx` | `PromptRunner.tsx` → both prompts/run routes |
| `features/chat/components/response/user-message/UserMessage.tsx` | `ResponseColumn.tsx` → `/chat` |
| `features/chat/components/response/assistant-message/stream/ToolCallVisualization.tsx` | Deprecated shim → `ChatStreamDisplay.tsx` (production `/chat`) |
| `features/chat/components/response/tool-renderers/` | Deprecated shims → `/chat`, admin tools, demos |
| `components/conversation/ToolCallVisualization.tsx` | `ChatStreamDisplay.tsx` (production) + internally |
| `features/public-chat/components/MessageDisplay.tsx` | `/p/chat`, `/ssr/chat` |
| `features/public-chat/components/ChatInputWithControls.tsx` | `/p/chat`, `/ssr/chat` |
| `features/public-chat/context/ChatContext.tsx` | `/p/chat`, `/ssr/chat` |
| `lib/redux/rootReducer.ts` | Everything (global) |

---

## 6. Immediate Next Action

**Step 1: Move `components/conversation/` → `features/conversation/components/`**

This is a pure file move with import updates. It establishes the correct directory structure before any route migration touches production code. Since none of these files have external consumers (except `ToolCallVisualization`), the only production risk is updating `ChatStreamDisplay.tsx`'s import to the new path.

After the move, proceed with Steps 2–6 in order.
