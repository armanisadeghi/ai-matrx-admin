# Phase 10 — Applets Capture (Parent-App-with-Children)

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 1 (context slots foundation), Phase 8 (agent-apps infra)
**Unblocks:** Phase 20 (sunset `features/applet/`)

## Goal

Capture the parent-app-with-children vision from the legacy applets system (`features/applet/`, `app/(authenticated)/apps/custom/[slug]/[appletSlug]/`) as an **agent-native pattern** using `features/agents/components/context-slots-management/`. Cross-app context sharing — impossible when applets were built — is native today.

Do **not** port applet code over. Capture the ideas; express them in the agent system.

## Success criteria
- [ ] Design doc committed to `features/agents/migration/phases/phase-10-applets-capture.md` (this file, expanded) describing the parent-child pattern in agent terms.
- [ ] Prototype or reference implementation showing: one "parent" agent app, multiple "child" agent apps, and a shared context slot that all children read/write.
- [ ] Migration guide for the one or two live applets (if any) to the new pattern.
- [ ] `features/applet/` marked for deprecation in `DECISIONS.md` (already logged 2026-04-20 entry).

## Change log
| Date | Who | Change |
|---|---|---|
