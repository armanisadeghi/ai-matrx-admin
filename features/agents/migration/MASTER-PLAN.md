# Master Plan — Prompts → Agents Migration

Read [`README.md`](./README.md) before touching anything here. Read [`INVENTORY.md`](./INVENTORY.md) for the legacy surface.

## How to read this file

- Phases are **ordered**. Do not begin a phase until its prerequisites are `complete`.
- Each phase has a dedicated doc in `./phases/phase-NN-<slug>.md`. That doc is the truth for scope and status.
- This file only shows goal, prerequisites, and status. Details live in the phase docs.

## Architecture anchors (apply everywhere)

- **State**: RTK only. Extend existing slices (`features/agents/redux/**`) — never create local/parallel state.
- **Shortcuts are multi-scope from day 1**: admin / user / org. The schema (`agx_shortcut`) already carries `user_id`, `organization_id`, `project_id`, `task_id`. `shortcut_categories` does **not** yet — Phase 1 fixes this.
- **CRUD components are shared**: built once in `features/agent-shortcuts/`, mounted by admin/user/org routes.
- **Context menu is the single highest-impact surface**: ~1765 LOC today, called by notes, code editor, file system, prompt editor. Replace before touching downstream.
- **Chat is the crown jewel**: `/chat` under the `(a)` route group. If the agent runner is built correctly, `/chat` is ~95% shell.

## Phase list

| # | Phase | Status | Doc |
|---|---|---|---|
| 0 | Governance & docs bootstrap | complete | _this file + `README.md` + `INVENTORY.md`_ |
| 1 | Agent Shortcuts foundation (multi-scope DB + RTK + API + shared CRUD feature) | code-complete (1.9 pending DB apply) | `phases/phase-01-agent-shortcuts-foundation.md` |
| 2 | Content Blocks migration | in-progress (2.1 done; 2.2 pending DB; 2.3 pending) | `phases/phase-02-content-blocks.md` |
| 3 | Unified Agent Context Menu (replace 1765-LOC component) | **complete** | `phases/phase-03-unified-context-menu.md` |
| 4 | Quick Actions re-scope (overlay dispatches, not agents — design decision needed) | **needs-design-decision** | `phases/phase-04-quick-actions.md` |
| 5 | Context-menu integration sweep (notes, code editor, agent builder, SSR RPC) | **complete** | `phases/phase-05-integration-sweep.md` |
| 6 | Code Editor quick wrapper (keep prompt-app editing working) | **blocked** on agent-id decision | `phases/phase-06-code-editor-quick-wrapper.md` |
| 7 | `(a)/chat` — unified chat flagship route | partially-complete (community stub; keybind wiring deferred) | `phases/phase-07-chat-route.md` |
| 8 | Agent Apps public runner (`/p/[slug]`) | code-complete (pending DB apply) | `phases/phase-08-agent-apps-public.md` |
| 9 | Admin Agent Apps management UI | **complete** | `phases/phase-09-admin-agent-apps.md` |
| 10 | Applets capture (parent-app-with-children + shared context slots) | design-complete (implementation pending 3 user questions) | `phases/phase-10-applets-capture.md` |
| 11 | Admin Shortcut management UI | **complete** | `phases/phase-11-admin-shortcuts-ui.md` |
| 12 | User Shortcut management UI | **complete** | `phases/phase-12-user-shortcuts-ui.md` |
| 13 | Org Shortcut management UI | **complete** | `phases/phase-13-org-shortcuts-ui.md` |
| 14 | Dual-run & parity verification behind flag | not-started | `phases/phase-14-dual-run.md` |
| 15 | Native Code Editor rebuild (agent tools, VSCode-style context slots) | not-started | `phases/phase-15-native-code-editor.md` |
| 16 | Deprecate prompt routes | not-started | `phases/phase-16-deprecate-routes.md` |
| 17 | Deprecate prompt APIs | not-started | `phases/phase-17-deprecate-apis.md` |
| 18 | Remove prompt feature code | not-started | `phases/phase-18-remove-features.md` |
| 19 | DB cleanup (drop prompt tables) | not-started | `phases/phase-19-db-cleanup.md` |
| 20 | Final sweep (`aiChatSlice`, legacy `ai_agent`, doc consolidation) | not-started | `phases/phase-20-final-sweep.md` |

## Dependency graph

```
Phase 1 ─┬─▶ Phase 2 ─┬─▶ Phase 3 ─▶ Phase 4 ─▶ Phase 5 ─┬─▶ Phase 6 ─▶ Phase 15
         │            │                                 ├─▶ Phase 7
         │            │                                 ├─▶ Phase 8 ─▶ Phase 9
         │            │                                 └─▶ Phase 10
         └───────────▶ Phase 11 ─ Phase 12 ─ Phase 13 (parallel track — unblocked after Phase 1)

Phase 14 runs once Phases 2–13 are complete.
Phase 15 runs once Phase 14 is verified.
Phases 16–19 run strictly sequentially after Phase 14 + 15 green.
Phase 20 is the victory lap.
```

## Start here

The next actionable phase is **Phase 1**. Read [`phases/phase-01-agent-shortcuts-foundation.md`](./phases/phase-01-agent-shortcuts-foundation.md) and ship the first task on the list.
