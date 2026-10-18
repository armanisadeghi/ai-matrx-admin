---
name: canonical-table-usage
type: Skill
title: Canonical table usage
description: "Approved table usage rules. Use when configuring, migrating, or reviewing MatrxDataTable columns, toolbars, or pagination."
tags: [tables, ui]
timestamp: 2026-10-17
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/canonical-table-usage/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# Canonical table usage

1. Dense tables keep independently meaningful values in separate columns; do not stack unrelated fields to save width.
2. Every value users need to sort or filter must have its own column and accessor, even if initially hidden.
3. Deliberately combined cells must keep each intended line unwrapped, truncate overflow, and expose full values through canonical tooltips or detail controls.
4. Use the canonical title, toolbar and footer. Do not add duplicate title/count rows or pagination footers.
5. New and converted tables use the shared `MatrxDataTable` with adjustable desktop columns enabled by default. Do not disable `resizableColumns` or a column's `resizable` flag without recording the specific purpose and decision-maker. A legacy grid does not inherit this default; migrate it or explicitly track that capability gap.
6. Before converting a hand-built table, screenshot it in place and apply [canonicalize without destroying](../../policies/no-dead-ends.md): if the converted table is visibly worse in its spot (a box inside a box, lost counts or columns, added chrome), the hand-built design is adopted into the table package as an option or new primitive, never replaced by the default. A table inside a card, section or panel never adds its own frame inside the host's frame.
7. Never re-style the table or its toolbar from the page: no `className` / `tableClassName` on `MatrxDataTable`, `TableTitleRow`, `TableViewTabs` or their siblings, and no arbitrary variant reaching into them (`[&_[data-matrx-…]]`, `[&_thead]`, `[&_td]`). Use the package's option (`density`, `frameHeight`, `emptyHeader`, `toolbar.portalInto` / `tabsPortalInto`); a missing option is added in `@ai-matrx/design-system`, released and adopted the same session. Guards: ESLint `matrx/no-canonical-component-override` and `pnpm findings` (ui-drift rule `canonical-override`, shrink-only).
8. A table whose people ask "how many, how much, by what" (a status, an owner, a date, an amount) offers drill-down and never hand-builds group counts beside it. Local vs server, levels, declaring, verifying: the `table-drill-down` skill.
9. Copy / Alchemy is never switched off: no `copy={false}`, `copy: false`, `showRow: false`, `showToolbar: false`, `copyControls` false or `hideToolbar` on `MatrxDataTable` / `EntityList` — place the control, don't remove it. Genuine exception: `// table-copy-optout: <reason>`. A new table is `MatrxDataTable`, never a raw `<table>` or `components/ui/table`. Guard: `pnpm check:one-table-law` (fails on both; the hand-built baseline only shrinks).

## Records, links and filters (Arman, 2026-10-17)

10. **Known field types decide the filter — no guessing.** Every column of data from our database declares its field type in `format` (`date`/`datetime` for timestamps, `currency`/`number`/`integer`, `choice` for enums, `person` for user ids, `boolean`); the filter follows it (dates get presets and a range, choices a value list with counts). Inference is only the fallback. Never `filter: "text"` on a date, enum or number column; `filter: false` on one needs `// table-filter-off: <reason>`. Value lists appear by themselves for ≤24 short distinct labels (≤50 when the column is named status/kind/type/role/tier/stage…).
11. **Filters can exclude.** Every filter on a local table offers "doesn't contain" / "is not". A remote (controlled) query owner implements negation and the `date` kind before its columns declare them — a filter the source silently ignores is a defect.
12. **The URL is the view, automatically.** Every list table has a stable, unique `tableId`; search, sort, filters, page and the open record then live in `table.<id>.*` with no extra code. A page-level filter beside the table (a status switcher) stores under the same `table.<id>.` namespace so record links carry it. `urlState={false}` only with a recorded reason.
13. **Every record has three doors.** The window (View lists the columns as the grid draws them, then every field; Edit appears when the row is editable — give `window.renderEdit` when editing needs more than cells); `getRowHref` whenever the record has its own route; and on that route the same list in the route's `layout.tsx` as `presentation="list"` with `activeRowId` (beside it via `ListDetailSplit`). Row click defaults to the window; change it only with `rowClick`.
14. **A link to a record never fails silently.** Link to a record as `?table.<id>.window=<id>`. A table over our database gives `resolveMissingRow` so a deleted, merged or moved id says what happened and opens its live twin.
15. **Replacing a table loses nothing.** Before converting, list everything the old table did (columns, filters, editing, menus, archived views, expansion, exports); anything the shared table lacks is built IN the package first, released, then used. A capability you cannot build now stays on the old table and is filed — never dropped.
16. **Pick the lightest shared piece — never hand-roll.** The ladder, lightest first: one fact → `PropertyRow` (a bordered group: `RowGroup`); a list of records (title, second line, meta, actions, selection) → `RecordList` from `@ai-matrx/design-system/record-list` (one row alone: `ItemRow`, names via `EntityRef`); a small fully loaded set with columns or sorting (up to a few hundred rows) → `LiteTable` from `@ai-matrx/design-system/lite-table` (same `MatrxColumnDef`, `read`, `emptyState`, `getRowHref` as the full table: graduate by changing the import); filters, paging, editing, grouping or bulk actions → `MatrxDataTable` (framed: `MatrxTableCard`); a module list page → `EntityListPage`. A raw `<table>` or a mapped bordered hover `<div>` is never the answer; a need none of these covers is a package request, not a local component.

