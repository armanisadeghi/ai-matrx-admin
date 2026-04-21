# Phase 14 — Dual-Run & Parity Verification

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phases 2–13 complete
**Unblocks:** Phases 15–19

## Goal

Run both systems in parallel under a feature flag. Gather parity signal before any deletion.

## Success criteria
- [ ] Environment flag `PROMPTS_MIGRATION_SHADOW_MODE` (or similar) exists.
- [ ] In shadow mode, each prompt execution is matched to an agent execution; outputs compared.
- [ ] Parity dashboard (simple — DB table + one admin view) shows hit/miss rate.
- [ ] At least one week of production soak with zero material divergences before Phase 15 begins.

## Change log
| Date | Who | Change |
|---|---|---|
