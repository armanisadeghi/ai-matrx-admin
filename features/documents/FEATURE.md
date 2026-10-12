# FEATURE.md — `documents` (Univer documents, "Cloud document")

Domain tree: content > documents. Split out of `features/data-tables` on 2026-10-07; routes
`/documents` and `/documents/[id]` are unchanged (`components/DocumentRecord.tsx` renders the record
page). Holds the document editor, model (`document-model/`), service (`document-service.ts`),
Markdown <-> Univer converters, the page/canvas theme, history views and the agent-context builders.
Shared Univer runtime: `lib/univer/`; collab: `lib/collab/`. The data-model and history notes for
documents and workbooks live together in `features/workbooks/FEATURE.md`.

- ✅ Univer 1.0.4 `docs-hyper-link` and `docs-drawing` presets loaded in `DocumentEditor` (links and images in the ribbon). Images are stored in the file store and the document keeps a `matrx-file:<id>` reference (`lib/univer/univerImageStore.ts`); comment attribution keeps Univer's owner-role id (`univerOwnerId`), so a signed-in person can edit.

## Editor chrome — Google Docs layout (2026-10-12)

The editor page is full-bleed (`EditorDocumentHeader`, shell page-top template): product icon (back to the list), title edited in place (`EditorTitleField`: auto-width, Enter/blur saves, Escape/failure restores; collaborators' renames arrive live through `useLiveFileName`), star and move marks (`FileTitleMarks`), cloud save status (press = save now), the menu bar File/Edit/View/Insert/Format/Tools/Help whose File is the ONE shared file menu (`useFileRecordMenu` with `menubar`), right actions (history, comments, extensions, Share last) and the toolbar row with the Menus search (Alt+/). Univer's ribbon is off (`toolbar: false`). Every row runs a real Univer command; the map is `chrome/doc-commands.ts`, guarded by `__tests__/doc-menus-run-real-univer-commands.test.ts` (every id exists in the installed Univer bundles; no row is a no-op). `DocumentRecord layout="page"` draws it; a board tile (default "tile") keeps its compact bar and gains the same toolbar. Not offered (no free Univer command): line spacing, indent outside lists, spelling.
