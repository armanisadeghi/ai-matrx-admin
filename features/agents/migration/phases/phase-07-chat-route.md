# Phase 7 — `(a)/chat` — Unified Chat

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 5 (context menu live); Phase 1 (shortcuts) recommended for in-chat shortcuts
**Unblocks:** Phase 20 (retire `aiChatSlice`)

## Goal

Ship `app/(a)/chat/` as a thin shell over the existing agent runner. Chat is an agent runner where the "agent" is selected from the user's own agents, system agents, and community agents. If the execution-system is correct, this is ~95% automatic.

## Crown-jewel status

Per user: "the single most important feature we'll ever build for our application." Treat it as such — extra care on mobile, accessibility, keyboard shortcuts, streaming smoothness, and first-paint time.

## Success criteria
- [ ] `/chat` entry route opens a default conversation with the user's default agent.
- [ ] Agent picker scoped across own / system / community.
- [ ] Conversation list + deep-link to specific conversation.
- [ ] Uses `features/agents/redux/execution-system` entirely — no new slices.
- [ ] No `usePromptRunner` usage.
- [ ] Mobile: drawer for agent picker, bottom-safe input, 16px input font.
- [ ] Keyboard shortcuts: new chat, switch agent, focus input — wired via Phase 1 shortcuts (user-scope).

## Out of scope
- Retiring `lib/redux/slices/aiChatSlice` — Phase 20.
- Migrating `features/public-chat/` — evaluate during this phase; may be separate follow-up.

## Change log
| Date | Who | Change |
|---|---|---|
