---
name: ui-dense
subject: platform/ui-shell
description: "Dense UI posture — maximum information density with clear hierarchy. Use when building or reworking admin dashboards, data tables and grids, ops or monitoring views, settings-heavy panels, debug inspectors, state or log viewers, and multi-pane tool UIs someone drives all day."
---

# ui-dense — maximum information density, with hierarchy

<!-- rules:stamp -->
> Rules from `common-docs/systems/platform/ui-shell/FEATURE.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Delete means archive, everywhere.** A delete that does not archive is a defect.
2. **A menu regroup ships as a side-by-side demo page** with a what-goes-where list, never as a
   direct change.
3. **Every surface mounts the canonical menu.** Use `NonEditableContextMenu` or
   `EditableContextMenu` from `features/context-menu-v3/`. Never use a bespoke `DropdownMenu` or a
   raw `contextmenu` handler, and never keep both.
4. **A menu without a source is a defect.** A menu with no `contentSource`, `entity` or
   `surfaceName` opens with every verb dark. Fix these before unwired surfaces.
5. **Lists built on `EntityListPage` inherit the row menu** through `ItemContextMenu`. They need
   their own wiring only for surface-specific sections.
6. **A window or overlay mounts its own menu.** It never delegates to the page under it.
7. **Reuse the domain's action registry.** Never create a second one.
8. **Secret-bearing surfaces follow `VaultContextMenu`.** Pass `getApplicationScope`, force
   `selection: ""`, put names and field keys in the content (never values or notes), and pass no
   `entity`.
9. **Done means the menu opens clean.** The console shows no `INERT MENU` or
   `VALUE MAPPING GAP` scream.
10. **Chat is a universal agent host.** Never bind a page-agent roster to it.
11. **Anything with an id shows it through the one canonical id component** (display plus one-click copy).
12. **Flagship and first-run screens get a bespoke elevated stage**, not the 28px app-chrome controls.
13. **Before a link goes to Arman, every screen on its path passes the Steve Jobs bar** (walked and fixed by an Opus reviewer).
14. **Admin tables filter, search and sort on the server**, and people are picked by name or email, never by id.
15. **Wasted vertical space is the worst sin;** every status shown is backed by real state.
16. **A new output style or menu layout is a NEW function used only by the new path;** never thin a shared builder.
17. **A page fetches only what it shows, each thing once;** every removed fetch ships its on-engagement load.
18. **Floating things never move the page.** Pills, assists, badges, alarms, notices, toasts and the
   chat dock float over it; when one would cover something, it moves itself (lifts, rests above
   the bar, yields). No page pads, shrinks or re-centres for one. Only the empty scroll room after a
   page's last line may grow. Guard: `pnpm check:overlays-never-move-page` (matrx-frontend).
<!-- rules:stamp-end -->

**Density is your identity — not a nice-to-have you reach for if there's spare time.** Your one job is to fit a lot, cleanly, so a viewer thinks *"how is all of this fitting here so neatly?"* The hard rule of your craft: **a modest, single-purpose screen must not scroll.** If the content can fit on one screen with no scroll, making it fit is *mandatory*, not optional — even a simple one-input form is a density problem to solve, not an excuse to spread out. Oversized tiles, generous cards, and vertical scrolling for modest content mean you abandoned your specialty. When in doubt: tighter.

## The result this gives

Maximum useful information on screen with **clear hierarchy** — for the power user, the data-heavy surface, the enterprise/admin tool driven all day, where speed and scannability beat breathing room. The ruled champions for this discipline are Linear at its densest and a Bloomberg terminal (`common-docs/policies/champions.md`). More on screen, nothing wasted, everything fast to reach.

Run this for admin dashboards, data tables/grids, ops and monitoring views, settings-heavy panels — any surface used all day by someone who wants it tight.

## Read first

- `.claude/ui-skills/shared/ground-rules.md` — the non-negotiable floor (above all: **build it real, never fake**).
- `.claude/ui-skills/shared/design-system-anchors.md` — exact tokens / glass / components to reuse.
- [data-dense-rules.md](data-dense-rules.md) (in this skill; absorbed the former `data-dense-panels` skill) — the concrete construction rules for dense panels: theme-token-only colors, font-size floors (`text-xs` minimum), the 4px grid, resizable-panels v4 (`pct()`), dialog/overlay compatibility, JSON-tree patterns, the ship checklist, and the anti-pattern table. Mandatory for inspectors, debug panels, state/log viewers, and multi-pane tool UIs.

## Interview first — 2-3 questions, in plain conversation, skippable

> **Only when a person asked you, live, to redesign this page.** In a page pass, a campaign, or any run with no one waiting on your reply, skip the interview entirely: answer these questions yourself from the page, its FEATURE.md and the best product doing the same job, log your answers, and go (`page-pass` step 0).

Ask. Skip if covered. These surface what to prioritize so density doesn't become noise:

1. **What are the top 3-5 things the daily user must see at once, without clicking or scrolling?**
2. **What actions do they take most — and do they want keyboard shortcuts, bulk actions, or inline editing?**
3. **What data scale (rows/items)?** — does this need real virtualization, server-side filtering, pagination?

Your blind spot is density *without* hierarchy collapsing into noise — these answers tell you what earns the prime real estate.

## How you work

- **Default to tables/data-grids.** Use `MatrxDataTable` (`@ai-matrx/design-system/data-table`; rules in `table-drill-down`) for homogeneous records; reach for cards only when items are genuinely heterogeneous or visual.
- **Hierarchy via type scale, weight, and our `--elevation-*` tokens — never boxes-in-boxes.** Tight spacing on the 4/8/16/24/32 scale, but space still *means* something: it groups and separates, it isn't sprayed.
- **Compact status:** real-time/streaming state as color + label + small indicator, not big hero cards.
- **Keyboard-first where it helps;** inline row actions; bulk selection if they work in batches.
- **Use the full width and height** — never trap a dense utility in a narrow centered column. `(core)` routes: `h-full` body wrapper + `<PageHeader>`; see `features/shell/components/header/variants/USAGE.md`.

## Guardrail

Dense ≠ cramped or noisy. Hierarchy is the entire difference between a Bloomberg terminal and a mess. If you can't make it instantly scannable — eye lands on the most important thing first — you've packed in too much or flattened the hierarchy. Fix the hierarchy before you remove information.
