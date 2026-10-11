---
type: Feature
title: "Access setup — the People involved panel"
description: "The shared panel that shows, for any record type that declares an access setup (iam.access_setup), every seat of people involved, who fills it now and why, the parts each seat sees and from which stage, and lets the people allowed add, exclude, undo and confirm. Opens at the moment of creation and from a record's People involved action."
tags: [access, access-setup, seats, parts, window-panel, hr, performance-review]
timestamp: 2026-10-10
---

# Access setup — People involved

Plan and product truth: `common-docs/systems/platform/access/projects/access-setup/PLAN.md` (§5b, §5c).
This file is the local mechanics only.

## What it is

One shared panel for every record type with an `iam.access_setup` declaration. Rows per seat: the
seat, who fills it and why (from the record · HR in the organization · added here · shared ·
fallback: organization owner), the parts that seat sees with their stage, and — only where the
viewer's seats are in the seat's `assignable_by` or the admin seats — Add / Exclude / Undo. Seats
the viewer cannot change are read-only with a link to where they are set. Access is already correct
before it opens (live resolvers + fallbacks); Confirm only writes the access-log row.

## Files

| File | Role |
|---|---|
| `service.ts` | THE one caller of the doors (never throws; refusals become sentences) |
| `types.ts` | Parsers for the door JSON and the creating door's `access_setup` block |
| `redux/accessSetupSlice.ts` | State per record (`<type>:<id>`) and per cycle (`cycle:<id>`); every write re-reads the door |
| `registry.ts` | Per-type labels (seats, parts, stages, knobs) and where a read-only seat is set |
| `components/AccessSetupPanel.tsx` | The record panel |
| `components/CycleAccessSetupPanel.tsx` | The bulk-creation panel (a review cycle): org-wide seats, stage knobs, each review's panel |
| `afterCreate.ts` | `useAfterCreateOpenAccessSetup()` → `afterCreateOpenAccessSetup(response)`, THE only caller that opens the panel after a creation |
| `features/window-panels/windows/access-setup/AccessSetupWindow.tsx` | Window `accessSetupWindow` (ephemeral) wrapping the panels; opener `useOpenAccessSetupWindow` |

## Doors

`iam.record_access_setup(type, id)` (read) · `iam.record_seat_set` (add / exclude) ·
`iam.record_seat_clear` (undo) · `iam.record_setup_confirm(type, ids[])` (audit `seat_confirm`) ·
`hr.hr_review_cycle_access_setup(cycle)` · `hr.hr_owner_takes_hr_role(org)` (small company: the owner
takes HR through `hr_activate_employer` / `hr_employee_create` / `hr_role_assign`). Migration:
`migrations/campaign/accesssetup_h_the_setup_panel_reads_and_confirms.sql`.

A seat may declare `add_via {fn, action}`: `record_seat_set` refuses a direct add there (`add_via`) and the
panel's Add calls `iam.record_seat_add_via`, which runs the type's own flow as the caller (hr peers:
`hr.review_seat_add_peer` → `hr_review_peer_nominate`, employee → pending, manager → approved). The read
returns `may_add` / `may_exclude` / `add_via` per seat and `may_confirm`; exclude and confirm belong to the
admin seats and the organization's owners/admins. A setup may declare `stage_meaning_fn`; each cell's
`opens_at` is its `from_stage` resolved under the record's knobs, and the stage label reads `opens_at`.
Migrations `accesssetup_o_…`, `accesssetup_o2_…` (the access gate describes a setup type from its seats).

## Opening rules

- A creating door returns `access_setup: {head_type, ids, cycle_id?, needs_confirm}`; `needs_confirm`
  is true while the organization never confirmed that type, when a record has a seat filled only by
  the fallback, or when knob `access/setup_panel_every_time` (default off) is on.
- A bulk creation opens ONE panel for the cycle; per-review changes are on each review's People involved.
- Wired today: `hr.hr_review_cycle_launch` → `CyclePage`; review workspace header action.

## Adding a type

Declare its setup (migration), add a `registry.ts` entry (labels + `setAt`), return `access_setup` from
its creating door, call `afterCreateOpenAccessSetup` after the create, and put a People involved
action on its record page.

## Change log

- 2026-10-10 — created (lane access-setup): record + cycle panels, window, after-create helper, review wiring.
- 2026-10-11 — add_via (peer adds go through nomination), exclude/confirm only for admin seats and owners/admins, `opens_at` stage labels.

## Store Tables — who sees and edits a column (PLAN §12, phase 1)

- `components/ColumnAccessPanel.tsx` — the column's People involved panel, opened from a Table column header
  ("Who can see and edit…") through the records-ui host port `columnAccess` (wired in
  `features/data-tables/records-ui-host/recordsUiHost.tsx`). Part name + how private + every person who reaches
  the Table (Sees / Edits / Hidden); a proposal is asked of the store first and marks who loses sight or editing.
- `columnAccessService.ts` — `custom.field_access_setup` (read; `p_proposed` counts who loses sight) and
  `custom.field_access_set` (table admins only, never an agent; audited). Migrations `accesssetup_store_a…e`.
- Phase 1 answers from the sensitivity word (a part's columns share one word); nothing is swapped yet.

