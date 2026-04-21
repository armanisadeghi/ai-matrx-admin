# Phase 4 — Quick Actions Re-scope

**Status:** needs-design-decision
**Owner:** _unassigned_
**Prerequisites:** Phase 1, Phase 3
**Unblocks:** Phase 5

## Discovery

Original premise in the master plan was "migrate hardcoded quick actions to DB-backed agent shortcuts." After reading `features/quick-actions/hooks/useQuickActions.ts`, this premise is **wrong**:

Quick actions dispatch `openOverlay({ overlayId: '…' })` — they open UI overlay sheets (Notes, Tasks, Chat, Data, Files, Utilities, VoicePad). They are **not agent invocations**. Placing them in `agx_shortcut` (which references `agent_id`) would be a type error.

The legacy UnifiedContextMenu's comment "Quick Actions (hard-coded for now, will be migrated to DB)" was probably about making them DB-driven for customization (labels, icons, ordering, scoped availability) — not for agent-backing.

## Design decision required

Three options, in increasing complexity:

### A) Leave them hardcoded, never DB-back
Pro: zero work. Con: admins / users can't reorder, hide, or relabel them; violates the "multi-scope from day one" principle for discoverable actions.

### B) New `app_actions` table, orthogonal to `agx_shortcut`
A parallel table with the same scope columns (user/org/global), plus a `handler_id` enum column (`'openOverlay:quickNotes'`, `'openOverlay:voicePad'`, etc.) and a small typed registry on the client mapping handler IDs to functions. The unified view (`agent_context_menu_view`) UNIONs this in alongside shortcuts and content blocks.
Pro: clean separation; lets admins / org admins add custom app-actions with scope rules; extends naturally to future non-agent actions (browser controls, deep links). Con: one more table + RLS set; view gets an extra UNION branch.

### C) Generalize `agx_shortcut` into `agx_menu_item` with a `kind` discriminator
Make the table polymorphic: `kind IN ('agent', 'app_action', 'content_block')` with nullable `agent_id` / `handler_id` / `template`.
Pro: single table, single view. Con: muddles the schema; content blocks remain cleanly separated in their own table today, so doing this midway through would invalidate Phase 1/2 decisions.

**Recommendation:** Option B. Keeps today's schema clean, ships the capability, lets us extend later without rework. Requires a short new migration + RLS mirror + view UNION branch.

## Tasks under Option B (pending decision)

- 4.1 DB: `app_actions` table, scope columns, RLS (mirror `content_blocks`)
- 4.2 Extend `agent_context_menu_view` to UNION in app-actions with `type = 'app_action'`
- 4.3 Seed migration: insert current hardcoded Zap menu items as global app-actions
- 4.4 Client-side handler registry `features/agent-shortcuts/handlers/app-actions.ts`
- 4.5 Wire `UnifiedAgentContextMenu` (Phase 3) to render app-action items and dispatch via the registry
- 4.6 Either delete `useQuickActions` or keep it as a thin convenience wrapper around the registry

## Out of scope
- Agent-backed overlay rewrites (e.g., "a Notes agent opens the Notes sheet"). That's a feature discussion, not a migration phase.

## Change log
| Date | Who | Change |
|---|---|---|
| 2026-04-20 | main agent | Phase re-scoped after discovery that quick actions are overlay dispatches, not agent invocations. Phase blocked on design decision (options A/B/C). |
