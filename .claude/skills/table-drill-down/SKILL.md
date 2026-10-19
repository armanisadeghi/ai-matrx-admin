---
name: table-drill-down
subject: data/drill-down
type: Skill
title: "Table drill-down — table usage rules, then group, break out, and land on a page about the value"
description: "Rules for the shared MatrxDataTable and its drill-down. Use when configuring, migrating or reviewing table columns, filters, toolbars, record links or pagination, adding group-by, 'by X' analytics or counts and sums by status, owner, model or day, or replacing hand-built totals or lists."
tags: [tables, ui, drill-down, analytics]
timestamp: 2026-10-19
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/table-drill-down/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# Table drill-down

A drill-down is a table about the thing you clicked, not a list of groups. Usage by user, click a
user, and you land on that user (header of facts and totals, one-click "By provider / agent /
conversation / day" chips); group by conversation and you see title, agent, started, last activity,
cost, calls, tokens. That second half is **levels**. API detail (needs `@ai-matrx/design-system`
>= 0.79.4) lives in `aidream/apps/shared/design-system/README.md` sections "Drill-down" and "How to
declare levels" (and its selector list); state and rules in
`common-docs/systems/data/drill-down/STATE.md`. Do not copy them here or into the page.

## 0. Table usage rules (every MatrxDataTable)

1. Dense tables keep independently meaningful values in separate columns; do not stack unrelated fields to save width.
2. Every value users need to sort or filter must have its own column and accessor, even if initially hidden.
3. Deliberately combined cells must keep each intended line unwrapped, truncate overflow, and expose full values through canonical tooltips or detail controls.
4. Use the canonical title, toolbar and footer. Do not add duplicate title/count rows or pagination footers.
5. New and converted tables use the shared `MatrxDataTable` with adjustable desktop columns enabled by default. Do not disable `resizableColumns` or a column's `resizable` flag without recording the specific purpose and decision-maker. A legacy grid does not inherit this default; migrate it or explicitly track that capability gap.
6. Before converting a hand-built table, screenshot it in place and apply [canonicalize without destroying](../../policies/no-dead-ends.md): if the converted table is visibly worse in its spot (a box inside a box, lost counts or columns, added chrome), the hand-built design is adopted into the table package as an option or new primitive, never replaced by the default. A table inside a card, section or panel never adds its own frame inside the host's frame.
7. Never re-style the table or its toolbar from the page: no `className` / `tableClassName` on `MatrxDataTable`, `TableTitleRow`, `TableViewTabs` or their siblings, and no arbitrary variant reaching into them (`[&_[data-matrx-…]]`, `[&_thead]`, `[&_td]`). Use the package's option (`density`, `frameHeight`, `emptyHeader`, `toolbar.portalInto` / `tabsPortalInto`); a missing option is added in `@ai-matrx/design-system`, released and adopted the same session. Guards: ESLint `matrx/no-canonical-component-override` and `pnpm findings` (ui-drift rule `canonical-override`, shrink-only).
8. A table whose people ask "how many, how much, by what" (a status, an owner, a date, an amount) offers drill-down and never hand-builds group counts beside it. Local vs server, levels, declaring, verifying: §1–§5 below.
9. Copy / Alchemy is never switched off: no `copy={false}`, `copy: false`, `showRow: false`, `showToolbar: false`, `copyControls` false or `hideToolbar` on `MatrxDataTable` / `EntityList` — place the control, don't remove it. Genuine exception: `// table-copy-optout: <reason>`. A new table is `MatrxDataTable`, never a raw `<table>` or `components/ui/table`. Guard: `pnpm check:one-table-law` (fails on both; the hand-built baseline only shrinks).

**Records, links and filters**

10. **Known field types decide the filter — no guessing.** Every column of data from our database declares its field type in `format` (`date`/`datetime` for timestamps, `currency`/`number`/`integer`, `choice` for enums, `person` for user ids, `boolean`); the filter follows it (dates get presets and a range, choices a value list with counts). Inference is only the fallback. Never `filter: "text"` on a date, enum or number column; `filter: false` on one needs `// table-filter-off: <reason>`. Value lists appear by themselves for ≤24 short distinct labels (≤50 when the column is named status/kind/type/role/tier/stage…).
11. **Filters can exclude.** Every filter on a local table offers "doesn't contain" / "is not". A remote (controlled) query owner implements negation and the `date` kind before its columns declare them — a filter the source silently ignores is a defect.
12. **The URL is the view, automatically.** Every list table has a stable, unique `tableId`; search, sort, filters, page and the open record then live in `table.<id>.*` with no extra code. A page-level filter beside the table (a status switcher) stores under the same `table.<id>.` namespace so record links carry it. `urlState={false}` only with a recorded reason.
13. **Every record has three doors.** The window (View lists the columns as the grid draws them, then every field; Edit appears when the row is editable — give `window.renderEdit` when editing needs more than cells); `getRowHref` whenever the record has its own route; and on that route the same list in the route's `layout.tsx` as `presentation="list"` with `activeRowId` (beside it via `ListDetailSplit`). Row click defaults to the window; change it only with `rowClick`.
14. **A link to a record never fails silently.** Link to a record as `?table.<id>.window=<id>`. A table over our database gives `resolveMissingRow` so a deleted, merged or moved id says what happened and opens its live twin.
15. **Replacing a table loses nothing.** Before converting, list everything the old table did (columns, filters, editing, menus, archived views, expansion, exports); anything the shared table lacks is built IN the package first, released, then used. A capability you cannot build now stays on the old table and is filed — never dropped.
16. **Pick the lightest shared piece — never hand-roll.** The ladder, lightest first: one fact → `PropertyRow` (a bordered group: `RowGroup`); a list of records (title, second line, meta, actions, selection) → `RecordList` from `@ai-matrx/design-system/record-list` (one row alone: `ItemRow`, names via `EntityRef`); a small fully loaded set with columns or sorting (up to a few hundred rows) → `LiteTable` from `@ai-matrx/design-system/lite-table` (same `MatrxColumnDef`, `read`, `emptyState`, `getRowHref` as the full table: graduate by changing the import); filters, paging, editing, grouping or bulk actions → `MatrxDataTable` (framed: `MatrxTableCard`); a module list page → `EntityListPage`. A raw `<table>` or a mapped bordered hover `<div>` is never the answer; a need none of these covers is a package request, not a local component.

## 1. Add it, or not

- **Add** when the table has a few groupable columns (status, owner, model, a date) and number columns
  (amount, cost, count), or when the page hand-builds totals or rollup tables. The drill replaces them.
- **Do not add** to config editors, work queues, spreadsheet-style editors, or tiny tables.
- **Before absorbing a hand-built rollup, run the no-loss checklist**: its links, selection, scope
  panels, prior-window compare, zero-row behavior, special states. Each one is adopted into the
  primitive or the rollup stays. Never drop one silently.

## 2. Local or server (decide on completeness, not on convenience)

Local only if the list is **complete**. It is partial if any of these holds: it reached its fetch cap,
it is server-paged, a known total is larger than the rows held, or an API silently truncates. Check the
source's own cap and the true count (read-only SQL: `pnpm admin-query` in matrx-frontend). Then:

| The table holds | Use |
|---|---|
| Every row of its source, under 50,000 | **Local**: `drill={{ local: true }}` |
| Partial in any way above, or over 50,000 rows | **Server**: a declared `*.drill.ts` |

The table refuses in words ("List capped at 200: group on the server."). Never silence it by passing
`source`/`coverage` to make it look complete: pass them **honestly** (`source: { total }`,
`{ paged: true }`, `{ cap }`). `coverage.loaded` is inferred; do not set it.

A rollup the server computes (medians, rates, anything not a sum of the rows held) cannot be rebuilt
locally: it is a server definition. A server definition needs SQL (campaign file, clone rehearsal,
owner apply), so it is a planned piece of work, never a cheap fallback to keep the page moving.

## 3. Local, then levels

```tsx
<MatrxDataTable data={jobs} columns={columns} getRowId={(j) => j.id} drill={{ local: true }} />
```

Dimensions and Measures are inferred from `columns`. Rules the inference follows:

- An inferred Measure takes its column's `format` (money, duration, percent). `extraMeasures` is only
  for a new label or op.
- A column not on the row needs an accessor or it vanishes; the dev warning names it.
- **Nulls**: a Measure over blanks says what it means with `nulls: "unknown"` (the group reads
  Unknown) or `"count"` (the known part, then "N unknown"). Never silently sum the known values where
  the old page said "not available".

Then declare **levels** keyed by Dimension, for each Dimension someone will drill into:

- **`breakouts`**: the questions asked next about one value, most useful first, time last
  (`"due:month"`). A sibling definition's Dimension is `def:dim` (cross-definition).
- **`show`**: the numbers that matter for that thing, in reading order.
- **`attributes`**: facts constant inside the value's group (a user's organization). Never a per-row
  number. `attributes: []` suppresses the inferred ones.
- **`hide`**: keys never offered (Dimension, Measure or column).
- **`records`** (server): the columns "See these records" shows.

Worked local example (jobs by owner and client):

```tsx
drill={{ local: true, levels: {
  owner:  { breakouts: ["client", "project", "status", "due:month"], attributes: ["team"], show: ["count", "sum_amount"] },
  client: { breakouts: ["owner", "status", "due:month"], attributes: ["industry"] },
} }}
```

Dropped items (a level naming a non-Dimension) warn once in dev. Test levels instead of eyeballing:
`drillLevelProblems` and `drillDroppedItems` return the same findings for a unit test.

## 4. Server

1. Write `aidream/apps/shared/records/scripts/drill-definitions/<key>.drill.ts`, copying
   `ai_usage.drill.ts`: source, lanes (every lane gets a rule), Dimensions with `level`, Measures,
   `records`.
2. `pnpm drill:sync --write --lane <LANE>` (in `apps/shared/records`) writes the campaign migration;
   apply it the way DB changes are applied in this workspace (never hand-edit the generated
   `platform.drill_def__<key>()`).
3. `pnpm drill:sync` with no flag fails when a declaration and the live body differ or a definition is
   unsound. It must pass.
4. Mount `DrillExplorer` (matrx-frontend `components/official/drill-explorer/`, read its FEATURE.md)
   or `useDrill` in a records grid. Never a second explorer screen.

Worked server example, Arman's usage (usage, then a person, then "by conversation", then the
conversation level showing title, agent, started, last activity, duration, cost, calls, tokens):

```ts
{ key: "person", ..., level: { breakouts: ["provider", "model", "agent", "feature", "conversation", "at:day"], attributes: ["organization"] } },
{ key: "conversation", ..., level: { breakouts: ["request", "model", "at:hour"], attributes: ["agent", "person"],
  show: ["cost", "calls", "tokens_in", "tokens_out", "started", "last_activity", "duration"] } },
```

A level whose list equals the default has not been designed.

## 5. Verify

- **Link with the question in the address**: your page with `?drill.by=<dimension>` (it carries the
  level's `show`), or the playground `http://127.0.0.1:3026/?scenario=drill-level-owner` (`pnpm demo`;
  also `drill-level-breakout`, `drill-level-attributes`, `drill-partial`, `drill-ceiling`). Walk it as
  a user: group, click a value, read the header, click a chip.
- Stable selectors for a walk: `data-matrx-drill-group`, `-into`, `-breakout`, `-see-records`,
  `-focus-total`, `-focus-attribute`, `-crumb`, `-failed`, `-unknown` (full list in the README).
- Preview parking: `/__dev-walk?parked=1` keeps the walk off the user's screen.
- Check every number against a hand count or read-only SQL on the same rows. A drill that looks right
  and is not counted is worse than none.
- Look at it at 390 px wide. Real data only.

## 6. Anti-patterns

- A hand-built group table or totals strip beside the table.
- `local: true` on capped, paged or partial data, or `source`/`coverage` passed to dodge the refusal.
- Summing known values where blanks mean "unknown".
- Every level showing the same columns (levels not declared).
- Styling the table from the host (`className`, arbitrary variants). A missing option is added in
  `@ai-matrx/design-system`, released and adopted (§0 rule 7).
- A per-row measure listed as an `attribute`, or an id column offered as a Dimension.
- A second explorer or a one-off chart instead of `DrillExplorer` / `MatrxDrillChart`.

## Relocated

| Old skill | Now |
|---|---|
| `canonical-table-usage` (rules 1–16) | §0, same numbers |
