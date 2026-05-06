# Phase 7 — `(a)/chat` — Unified Chat

**Status:** partially-complete
**Owner:** claude (phase-7)
**Prerequisites:** Phase 5 (context menu live); Phase 1 (shortcuts) recommended for in-chat shortcuts
**Unblocks:** Phase 20 (retire `aiChatSlice`)

## Goal

Ship `app/(a)/chat/` as a thin shell over the existing agent runner. Chat is an agent runner where the "agent" is selected from the user's own agents, system agents, and community agents. If the execution-system is correct, this is ~95% automatic.

## Crown-jewel status

Per user: "the single most important feature we'll ever build for our application." Treat it as such — extra care on mobile, accessibility, keyboard shortcuts, streaming smoothness, and first-paint time.

## Success criteria
- [x] `/chat` entry route opens a default conversation — redirects to the most recent conversation if any exists, otherwise to `/chat/new` (agent picker).
- [x] Agent picker scoped across own / system / community (community is a disabled tab with a "coming soon" stub until the community catalog lands).
- [x] Conversation list + deep-link to specific conversation (`/chat/[conversationId]`). Deep link resolves the owning agentId server-side for SSR first-paint.
- [x] Uses `features/agents/redux/execution-system` + `conversation-list` entirely — no new slices. Extended `conversationList` with a `fetchGlobalConversations` thunk that reuses the already-existing `setGlobalListLoading/Success/Error` reducers.
- [x] No `usePromptRunner` usage.
- [x] Mobile: drawer for conversation history (global sidebar is hidden on mobile); drawer-swapped agent picker via `useIsMobile()`; bottom-safe input (reused `AgentConversationColumn` → `SmartAgentInput`); 16px input font on the picker search box; `pb-safe` on all drawers.
- [ ] Keyboard shortcuts: new chat (`⌘/Ctrl+K`), switch agent (`⌘/Ctrl+J`), focus input (`/`) — wired as **hardcoded** bindings inside `ChatPageShell`. Wiring into the Phase 1 user-scope shortcut table is deferred as a follow-up (no generic keybinding registry exists yet on agent-shortcuts; adding one is larger than this phase).

## Implementation

### Files created
- `app/(a)/chat/layout.tsx` — route metadata (CH letter badge) + shell dock hide.
- `app/(a)/chat/page.tsx` — landing that mounts `ChatLandingClient`.
- `app/(a)/chat/new/page.tsx` — Suspense-wrapped `ChatNewClient` (uses `useSearchParams`).
- `app/(a)/chat/[conversationId]/page.tsx` — server component that SSR-resolves `cx_conversation.initial_agent_id` and mounts `ChatRoomClient`.
- `features/agents/components/chat/ChatAgentPicker.tsx` — 3-tab (own / system / community stub) agent picker. Desktop popover, mobile drawer.
- `features/agents/components/chat/ChatPageShell.tsx` — shared page shell: desktop history sidebar + mobile history drawer + header slot + keyboard shortcuts. History is rendered by the reusable `ConversationHistorySidebar` (scope `chat-route`, `agentIds: []` to show all the user's conversations).
- ~~`features/agents/components/chat/ChatHistorySidebar.tsx`~~ — removed; replaced by `features/agents/components/conversation-history/ConversationHistorySidebar` (scoped, paginated, search + grouping).
- `features/agents/components/chat/ChatRoomClient.tsx` — the single-conversation client shell (new or loaded).
- `features/agents/components/chat/ChatNewClient.tsx` — agent picker landing for `/chat/new`.
- `features/agents/components/chat/ChatLandingClient.tsx` — redirects to last conversation or `/chat/new`.

### Reused components (no fork, no copy)
- `features/agents/hooks/useAgentLauncher.ts` — managed mode creates the instance + conversation; imperative mode would power future entry points.
- `features/agents/redux/execution-system/thunks/create-instance.thunk.ts::createManualInstance` — for hydrating a known conversationId into the instance slices before `loadConversation`.
- `features/agents/redux/execution-system/thunks/load-conversation.thunk.ts::loadConversation` — full bundle rehydration on deep-link.
- `features/agents/components/shared/AgentConversationColumn.tsx` — scroll + messages + `SmartAgentInput`. The entire streaming / input / message-actions surface comes from here.
- `features/agents/redux/agent-definition/selectors.ts::{selectOwnedAgents, selectSystemAgents, selectAgentExecutionPayload, selectAgentName, selectAgentById, selectAgentsSliceStatus}`.
- `features/agents/redux/agent-definition/thunks.ts::{initializeChatAgents, fetchAgentExecutionMinimal}`.
- `features/agents/redux/conversation-list/*` — entity store + new `fetchGlobalConversations` thunk (extension, not a new slice).

### First-paint strategy
- Server component `app/(a)/chat/[conversationId]/page.tsx` reads only `initial_agent_id` from `cx_conversation` (single-column query) so SSR is sub-RPC cost. The full message bundle hydrates client-side via `loadConversation`, streaming the run in as data lands. `/chat` landing performs a lightweight `limit: 5` fetch client-side purely to decide where to redirect.

### Agent picker scope
- `own` → `selectOwnedAgents`.
- `system` → `selectSystemAgents` (alias for `selectBuiltinAgents`).
- `community` → disabled tab with a "coming soon" placeholder. There is no community-agent concept in the codebase yet; gating it behind a stub avoids a silent UI regression when it lands.

### Extension to existing slice
- `features/agents/redux/conversation-list/conversation-list.thunks.ts` — added `fetchGlobalConversations` that reads `cx_conversation` directly (RLS filters to the user), filtering out ephemeral + deleted rows and ordering by `updated_at desc`. Dispatches the already-present `setGlobalList*` reducers on the `conversationList` slice. No shape changes.

## Out of scope (unchanged)
- Retiring `lib/redux/slices/aiChatSlice` — Phase 20.
- Migrating `features/public-chat/` — still imports `features/prompts/**` components; no `usePromptRunner`. Logged in `INVENTORY.md` under "surfaces to sweep later".
- `features/cx-chat/` — uses `features/prompts` for types + three component imports (`ResourceChips`, `ResourcesContainer`, `ModelSettingsDialog`, `VariableInputComponent`), no `usePromptRunner`. Logged in `INVENTORY.md` under "surfaces to sweep later".
- SSR `ssr/chat/a/[agentId]` route — coexists per the task rules.
- Wiring chat shortcuts into the Phase 1 user-scope shortcut table — hardcoded bindings for now.

## Change log
| Date | Who | Change |
|---|---|---|
| 2026-04-21 | claude (phase-7) | Phase 7 code-complete (partially — community picker stubbed, keyboard shortcuts hardcoded). Added `app/(a)/chat/{layout,page,new/page,[conversationId]/page}.tsx` and `features/agents/components/chat/{ChatAgentPicker,ChatPageShell,ChatHistorySidebar,ChatRoomClient,ChatNewClient,ChatLandingClient}.tsx`. Extended `conversation-list.thunks.ts` with `fetchGlobalConversations` (reuses existing `setGlobalList*` reducers; no new slice). Reused `AgentConversationColumn`, `useAgentLauncher`, `createManualInstance`, `loadConversation`, `selectOwnedAgents`, `selectSystemAgents`. Mobile handling: drawer-swapped picker + history via `useIsMobile()`; `pb-safe` on drawer footers; 16px picker search input. |
| 2026-05-05 | composer | Replaced the route-specific `ChatHistorySidebar` with the reusable `ConversationHistorySidebar` (scope `chat-route`). Desktop aside + mobile drawer now share a small `ChatHistoryPanel` wrapper that adds the "Conversations / + New" header. Deleted `features/agents/components/chat/ChatHistorySidebar.tsx`. Search and date/agent grouping are now built-in; favorites are not yet wired (no chat-scoped preferences field — follow-up if needed). |
