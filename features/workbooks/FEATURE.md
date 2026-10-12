# FEATURE.md — `workbooks` (Univer spreadsheets)

Domain tree: content > workbooks. Split out of `features/data-tables` on 2026-10-07; routes
`/workbooks` and `/workbooks/[id]` are unchanged. Documents (the Univer doc editor) are the sibling
feature `features/documents`; both share `lib/univer/` (theme, facade, dispose, snapshot-mutation
helpers) and `lib/collab/` (Yjs over Supabase Broadcast). `features/data-tables/export-targets.ts`
still builds the workbook a table is exported into.

## History (moved from data-tables)

Workbooks (`udt_workbooks`, lossless spreadsheets in Univer) and documents (`udt_documents`) are a
separate live surface (`workbook-service.ts`, `document-service.ts`, `/workbooks`, `/documents`).

- ✅ `udt_workbook_snapshots` table — append-only content store keyed by `workbook_id`; RLS mirrors `udt_workbooks`; viewers see all snapshots they can view the parent of; editors can append; in `supabase_realtime` publication.
- ✅ `workbook-service.ts` — `createWorkbook` / `listAccessibleWorkbooks` / `getWorkbook` / `renameWorkbook` / `deleteWorkbook` / `getLatestSnapshot` / `saveSnapshot` / `listSnapshots`.
- ✅ `useWorkbookRealtime` hook — Postgres-Changes subscription for `udt_workbook_snapshots` filtered by `workbook_id`.
- ✅ `WorkbookEditor` component — mounts Univer (`@univerjs/presets` + `@univerjs/preset-sheets-core`), hydrates from latest snapshot, debounces autosave (2.5s after last edit), hot-swaps on remote snapshots from other users; ignores echo of own writes. Status pill shows idle / dirty / saving / saved / error. Toolbar buttons: "Save now" (labeled snapshot, bypasses autosave) and "History" (opens snapshot timeline).
- ✅ Univer 1.0.4 free add-ons loaded in `WorkbookEditor`: sort, filter, table, data validation (dropdown/checkbox/date), conditional formatting, find & replace, cell links, images, notes, comment threads. Their data lives in snapshot `resources`, so autosave, history and collab carry it; `pnpm check:univer-addons` (real Univer) proves validation, conditional formatting, filter and notes come back from save -> load, and fails if an add-on is unregistered. Pictures are stored in the file store; the snapshot holds `matrx-file:<id>` (older inline pictures still render). Filter and Sort are also in the workbook header. Comment authors come from the signed-in account.
- **Dependency alignment:** keep every `@univerjs/*` package (core, themes, presets, all `preset-*`) together at one version — currently `1.0.4`. The document editor and Markdown converter require the 1.0 paragraph/section ID and document-save APIs.
- **Document canvas colours (Univer 1.0).** Univer paints its own fills as theme TOKENS (`"gray.0"` page, `"gray.100"` desk, `"gray.900"` ink). `renderDocumentCanvasColorsVerbatim` installs a colour service that resolves tokens from the live theme (`univer-theme-token-color.ts`) and inverts nothing — never `DumbCanvasColorService`, which passes `"gray.0"` to the canvas, where it is ignored and the page stays default black. `useUniverDocSurfaceTheme` finds the render through `getRenderUnitById` (1.0's name), and a pageless (modern) document's workspace takes the page colour, since its text sits on that fill. Guard: `pnpm check:univer-doc-theme` (+ `:self-test`) scans the shipped engine-render / docs-ui bundles for every token and drives the real `ThemeService` and `ColorKit`.
- **Verifying the document canvas headless.** A screenshot of a Univer canvas in headless Chromium is real rendering (CPU raster; old and new headless agree). Read the pixels directly: in the page, `document.getElementById("univer-doc-main-canvas").getContext("2d").getImageData(0, 0, w, h)` — a healthy page is mostly the paper colour with a few hundred distinct antialiased ink colours; `0,0,0,255` over most of the canvas is the black page, and a console line `[document] theme not applied to the page surface` means the host colours never landed. Capture the page with CDP `Page.captureScreenshot`; remove `nextjs-portal` first if another lane's build error overlay covers it.
- ✅ Routes — `/workbooks` (list + create + delete + **import XLSX/CSV**), `/workbooks/[id]` (open + rename + edit). Editor is dynamically imported with `ssr:false` so Univer never runs server-side.
- ✅ **XLSX/CSV import** — `xlsxToUniverWorkbook` has ONE reader (ExcelJS, `xlsx-to-univer-excel.ts`, through the single door `@ai-matrx/print/xlsx-styled`). .xls/.ods/.csv/.tsv are first re-written as .xlsx by the Alchemy workbook door (values, formulas, merges), then read by that same reader. Pre-flight parse so a malformed file does not leave an empty workbook husk. The original file id will plug into `udt_workbooks.original_file_id` once the universal file handler linkage is wired.
- ✅ **Snapshot history viewer + restore** — `WorkbookHistoryViewer` lists snapshots newest-first with origin badges (autosave / manual / imported / restored); Restore writes a NEW snapshot from the chosen one so the realtime hook hot-swaps automatically. Snapshots are append-only; restoring does not delete history.
- ✅ **Export workbook → XLSX** — `downloadUniverAsXlsx` (ExcelJS via the door; see the Excel import/export line below for what it carries and names). Wired as a toolbar button in `WorkbookEditor`; filename = workbook name.
- ✅ **Share + permission gating** — `udt_workbooks` added to client-side `SHAREABLE_RESOURCE_REGISTRY` (DB registry had it from P1). `/workbooks/[id]` header gets the standard `<ShareButton>`. Page calls `has_permission(udt_workbooks, id, 'editor')` at mount to decide whether the editor mounts in editable or viewer-only mode (owner always edits; shared editors detected via the RPC; everyone else sees viewer mode).
- ✅ **V2 — full CRDT collab is LIVE.** Yjs over Supabase Broadcast via the public `onMutationExecutedForCollab` hook; `collab` flag ON at `/workbooks/[id]`. Verified by `lib/collab/verify-collab.ts` (10/10, incl. real-Broadcast e2e). See `collab/FEATURE.md` — run the verify gate before touching the provider/session.

**P5 — operational hardening (decided 2026-06-06):**
- ✅ **aidream attribution — honest NULL.** Decided to keep `changed_by = NULL` for service_role / pool writes (no JWT). The audit trail honestly reports "system write" rather than misattributing to row owners. No code change required on aidream's side.
- ✅ **`udt_workbooks.original_file_id` FK live.** `REFERENCES cld_files(id) ON DELETE SET NULL`. Workbook import path now uploads the source file via `fileHandler.upload(...)` first and stores the `cld_files.id` on the workbook row. Upload failure is non-fatal — workbook still imports without the link.
- ✅ **Smart importer (P3).** `smart-importer.ts` routes an upload by 7 weighted signals (`ImportRouteDialog`, auto-route at `confidence > 0.6`). Its typed route reads the first sheet (`readImportGrid`) and opens the ONE "Save to a table" (`saveToTable` overlay → records-ui `SaveToTable`), which makes the table in the record store or adds the rows to an existing one.

**Workbook collab v2 — ✅ DONE (2026-06-12):**
- ✅ Implemented, verified (`collab/verify-collab.ts` 10/10 incl. real-Broadcast e2e), and flag flipped ON at `/workbooks/[id]`. Architecture + the three bugs the verify gate caught are documented in `collab/FEATURE.md`.
- ⏳ v2.1 polish (optional): pixel-positioned cursor rings over the actual cell (currently a toolbar presence strip); repurpose `useWorkbookRealtime` to log-only.

## Table link — a custom table and a sheet, synced on demand (2026-10-10)

`table-link/` is the one module. A custom table opens as a workbook ("Open as workbook" in the table
header) or a tidy sheet becomes a table ("Make table" in the workbook toolbar, through the ONE
`saveToTable` overlay — never a second importer); either way the sheet and the table are LINKED.

- **Where the link lives:** `udt_workbooks.metadata.table_links[]` (system metadata, one home):
  table id, sheet id, linked fields (field ↔ header, kind), `baseline_snapshot_id` (the snapshot
  saved at the last sync), `last_synced_at`. The table side finds its workbooks by a `metadata @>`
  read; nothing is written on the table.
- **The sheet's rules:** row 1 is the header row; the hidden `Record ID` column carries each row's
  record. Columns are found by header, never position. New rows → new records; new columns are
  listed and ignored unless the person adds them as fields; other tabs, side formulas, notes and
  formatting are never touched.
- **Updates are previews, both ways, three-way** (`sync-plan.ts`, tested): sheet now × table now ×
  baseline. An edit on one side wins; both → a named conflict defaulting to the side updated FROM.
  Sheet → table goes through the seam's `bulkWrite` (insert / merge / archive) and writes new ids
  back into the sheet; table → sheet writes cells in place through Univer (collab + autosave carry
  them). The table page's "Update from workbook" / "Refresh workbook" open the workbook with
  `?tableSync=update|refresh`, where the same dialog runs — one apply path.
- **Broken rules** are named by column ("Column B was "Stage", now "Pipeline stage"") with Restore
  header, or "Export fresh copy" (a new linked workbook; this one unlinks). Validation offers,
  never blocks — only a missing id column stops an update.
- Field types: choice → dropdown, multi-choice → multi dropdown, boolean → checkbox, dates →
  date validation + format, numbers/currency/percent → number formats, relations / lookups /
  formulas / rollups / stamps / JSON → read-only words (edits there are ignored and counted).
- ✅ Excel import/export (`xlsx-to-univer*.ts`, `univer-to-xlsx.ts`, ExcelJS, loaded on demand) carry values, formulas, merges, styles and number formats, column widths, row heights, frozen panes, data validation, conditional formatting (cell rules, colour scales, data bars), the filter range, notes, comment threads (as notes), cell links, pictures and the sheet tab colour. Not carried, and named to the person at export: checkboxes become TRUE/FALSE dropdowns, multi-select dropdowns become single-select, Excel tables become plain ranges, filter choices, icon-set/rank/date conditional formats. CSV/TSV/.xls/.ods import values, formulas and merges only (that is all those formats hold). Pictures: object URLs for painting are revoked when the editor closes (`releaseMatrxImageStore`).

## Editor chrome — Google Sheets layout (2026-10-12)

The editor page is full-bleed (`EditorDocumentHeader`, shell page-top template): product icon (back to the list), title edited in place (`EditorTitleField`: auto-width, Enter/blur saves, Escape/failure restores; collaborators' renames arrive live through `useLiveFileName`), star and move marks (`FileTitleMarks`), cloud save status (press = save now), the menu bar File/Edit/View/Insert/Format/Data/Tools/Help whose File is the ONE shared file menu (`useFileRecordMenu` with `menubar`), right actions (history, comments, extensions, Share last) and the toolbar row with the Menus search (Alt+/). Univer's ribbon is off (`toolbar: false`). Every row runs a real Univer command; the map is `chrome/sheet-commands.ts`, guarded by `__tests__/sheet-menus-run-real-univer-commands.test.ts` (every id exists in the installed Univer bundles; no row is a no-op). Google shortcuts Univer lacks (number formats Cmd+Shift+1-6, align Cmd+Shift+L/E/R, Print, Open, Version history) are bound by the chrome. View > Show > Formula bar hides Univer's formula bar by CSS (`data-formula-bar`; Univer has no runtime switch). Data cleanup (trim whitespace, remove duplicates) reads/writes through the facade (`setValues`, one undo step); remove duplicates refuses a range with formulas. `WorkbookDataToolbar` deleted (Filter/Sort live in Data and the toolbar).
