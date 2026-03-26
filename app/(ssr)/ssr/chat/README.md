# SSR Chat Route — `/ssr/chat`

## Route Structure

| Route | Purpose |
|---|---|
| `/ssr/chat` | Server redirect → `/ssr/chat/a/{DEFAULT_AGENT_ID}` |
| `/ssr/chat/a/[agentId]` | Agent welcome screen (blank conversation, SSR) |
| `/ssr/chat/c/[conversationId]` | Active conversation view |
| `/ssr/chat/[conversationId]` | Legacy redirect → `/ssr/chat/c/[id]` |

## Flow

### New Conversation
1. User lands on `/ssr/chat/a/{agentId}` — SSR renders agent name, description, variable inputs
2. Client island (`ChatWelcomeClient`) hydrates: loads agent config from DB if not builtin, renders interactive input
3. User fills variables (if any) and submits message
4. `firstMessage` dispatched to Redux, router navigates to `/ssr/chat/c/new?agent={id}&new=true`
5. `ChatConversationClient` reads `firstMessage` from Redux, skips DB fetch, instantly sends via `useConversationSession`
6. Backend returns real `conversationId` in `X-Conversation-ID` header → `router.replace` updates URL to `/ssr/chat/c/{realId}?agent={id}`
7. After stream completes, `loadConversationHistory` syncs real DB message IDs

### Existing Conversation
1. User navigates to `/ssr/chat/c/{id}?agent={agentId}` (from sidebar or bookmark)
2. Server warms the conversation on the Python backend
3. `ChatConversationClient` loads history via `useConversationSession({ loadHistory: true })`
4. Chat continues with standard send/stream cycle

## State Management

All shared state flows through Redux (`activeChatSlice`):
- `selectedAgent` — agent config (id, name, variables, dynamicModel, configFetched)
- `firstMessage` — queued message for welcome → conversation transition
- `modelOverride` — user-selected model (null = use agent default)
- `modelSettings` — user-modified settings
- `agentDefaultSettings` — baseline for dirty override detection
- `useBlockMode` — admin toggle, persists across conversations

**No sessionStorage. No component-local state for shared concerns.**

Variable form values are local to `ChatWelcomeClient` (form input, not shared).

## Key Files

| File | Role |
|---|---|
| `_lib/agents.ts` | Hardcoded builtin agents for instant SSR (no DB call) |
| `_lib/auth.ts` | Server-side auth check (non-blocking) |
| `_lib/settings-diff.ts` | Computes dirty overrides — only sends settings that differ from agent defaults |
| `_lib/useAgentConfig.ts` | Shared hook: loads agent config from DB, dispatches to Redux |
| `_components/ChatWelcomeServer.tsx` | Server component — renders agent name/description |
| `_components/ChatWelcomeClient.tsx` | Client island — input, variables, submit, model picker |
| `_components/ChatConversationClient.tsx` | Client island — conversation view, streaming, URL sync |
| `_components/ChatSidebarClient.tsx` | Client island — sidebar search, agent list, chat list |
| `_components/ChatHeaderControls.tsx` | Client island — desktop header (admin toggles, share) |
| `_components/ChatMobileHeaderBar.tsx` | Server component — mobile header shell |
| `_components/ChatMobileAgentName.tsx` | Client island — mobile agent name button |

## API Override Rules

The Python backend rejects requests that send default values as overrides. The `computeSettingsOverrides` function in `_lib/settings-diff.ts` compares user settings against `agentDefaultSettings` (stored in Redux) and only includes values that actually differ. Never send `config_overrides` unless they contain genuinely changed values.

## Deprecated Files (DO NOT USE)

- `_components/ChatWorkspace.tsx` — old monolithic SPA component
- `_components/DEPRECATED-SsrAgentContext.tsx` — old context provider
- `_components/DEPRECATED-ChatShellProviders.tsx` — old provider wrapper

These files are kept for reference but are not imported by any active code.
