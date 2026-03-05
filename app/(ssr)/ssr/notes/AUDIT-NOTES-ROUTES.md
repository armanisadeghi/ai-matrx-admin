# Notes Route Audit: Original vs SSR

## Original Route: `(authenticated)/notes`
## New Route: `(ssr)/ssr/notes`

---

## Feature Comparison

| # | Feature | Original | SSR | Status |
|---|---------|----------|-----|--------|
| 1 | **Desktop sidebar with folder tree** | NotesSidebar.tsx | SidebarClient.tsx | Included |
| 2 | **5 default folders** (Draft, Personal, Business, Prompts, Scratch) | defaultFolders.ts | SidebarClient.tsx | Included |
| 3 | **Custom folder support** | folderUtils.ts | SidebarClient.tsx | Included |
| 4 | **Folder expand/collapse** | NotesSidebar.tsx | SidebarClient.tsx | Included |
| 5 | **Folder note counts** | NotesSidebar.tsx | SidebarClient.tsx | Included |
| 6 | **Search by label + tags** | noteUtils.ts | SidebarClient.tsx | Included |
| 7 | **Sort by updated_at / label / created_at** | NotesHeader.tsx | SidebarClient.tsx | Included |
| 8 | **Sort order toggle (asc/desc)** | NotesHeader.tsx | SidebarClient.tsx | Included |
| 9 | **Note context menu (sidebar)** | NotesSidebar.tsx | SidebarClient.tsx | Included |
| 10 | **Move to folder (context menu)** | MoveNoteDialog.tsx | SidebarClient.tsx | Included |
| 11 | **Multi-tab editing** | NoteTabs.tsx | NotesWorkspace.tsx | Included |
| 12 | **Tab close / close others / close all** | NoteTabs.tsx | NotesWorkspace.tsx | Included |
| 13 | **Tab context menu** | NoteTabs.tsx | NotesWorkspace.tsx | Included |
| 14 | **Inline tab label editing** | NoteTabs.tsx | NotesWorkspace.tsx | Included |
| 15 | **Tab action buttons** (save, copy, share, delete) | NoteTabs.tsx | NotesWorkspace.tsx | Included |
| 16 | **Plain text editor mode** | NoteEditor.tsx | NotesWorkspace.tsx | Included |
| 17 | **Markdown preview mode** | NoteEditor.tsx | NotesWorkspace.tsx | Included |
| 18 | **Split view (editor + preview)** | NoteEditor.tsx | NotesWorkspace.tsx | Included |
| 19 | **Auto-save with debounce** | useAutoSave.ts | NotesWorkspace.tsx | Included (1.5s vs 3s) |
| 20 | **Conflict detection** | useAutoSave.ts + NotesContext.tsx | NotesWorkspace.tsx | Included |
| 21 | **Conflict resolution UI** | NoteEditor.tsx | NotesWorkspace.tsx | Included |
| 22 | **Note create** | NotesContext.tsx | NewNoteButton.tsx | Included |
| 23 | **Note delete (soft)** | NotesContext.tsx | NotesWorkspace.tsx | Included |
| 24 | **Note duplicate** | NotesContext.tsx | NotesWorkspace.tsx | Included |
| 25 | **Note export (download .md)** | NoteTabs.tsx | NotesWorkspace.tsx | Included |
| 26 | **Note share (clipboard copy)** | ShareNoteDialog.tsx | NotesWorkspace.tsx | Included |
| 27 | **Keyboard shortcuts** (Ctrl+W, Ctrl+Tab, Ctrl+S) | NoteTabs.tsx | NotesWorkspace.tsx | Included |
| 28 | **View mode portal to header** | NoteTabs.tsx | NotesWorkspace.tsx | Included |
| 29 | **Status bar** (save state, word count, char count) | NoteEditor.tsx | NotesWorkspace.tsx | Included |
| 30 | **Empty state (no note selected)** | NoteEditor.tsx | NotesWorkspace.tsx | Included |
| 31 | **Loading skeleton** | NoteEditor.tsx | NotesWorkspace.tsx | Included |
| 32 | **Mobile header with back button** | MobileNotesView.tsx | NotesWorkspace.tsx | Included |
| 33 | **Mobile bottom sheet (note options)** | MobileNoteEditor.tsx | NotesWorkspace.tsx | Included |
| 34 | **AI actions via context menu** | NoteEditor.tsx + UnifiedContextMenu | NoteAiMenu.tsx | Included |
| 35 | **Relative time formatting** | NotesSidebar.tsx | SidebarClient.tsx | Included |

---

## Previously Missing Features — Now Implemented

| # | Feature | Implementation | Deep Hydration Pattern |
|---|---------|---------------|----------------------|
| M3 | **Tag management** | Tags bar in NotesWorkspace between editor and status bar | Tags render as static badges immediately; add-tag input only hydrates on click |
| M4 | **Folder selector dropdown** | Folder button in tags/folder bar opens dropdown | Button renders with folder name immediately; dropdown content hydrates on click |
| M5 | **Auto-label generation** | `generateLabelFromContent()` inline in NotesWorkspace | Pure function, no component — runs in `handleContentChange` during scheduleSave |
| M7 | **Share link generation** | Share dialog with copy-to-clipboard + visual feedback | Dialog renders on demand with generated URL; checkmark feedback on copy |
| M11 | **Rename folder** | Inline rename dialog from folder context menu | Overlay + input, only for custom folders (not default 5) |
| M12 | **Delete folder (all notes)** | Folder context menu → "Delete All Notes" | Soft-deletes all notes in folder, dispatches events for sidebar sync |
| M13 | **Folder context menu** | Right-click folder headers: New Note, Rename, Collapse, Delete All | Menu renders on contextmenu event, positioned at cursor |
| M16 | **Mobile folder filter** | Horizontal pill row below search bar (mobile only) | Renders all folder pills immediately; click filters via URL param |
| M21 | **Sort field toggle** | Cycle button (updated_at → label → created_at) in search bar | Button renders with icon immediately; cycles sort field on click |
| M23 | **Mobile export note** | "Export as Markdown" button in mobile bottom sheet | Downloads .md file on click |
| M6 | **Create folder** | "New Folder" button at bottom of sidebar with inline input | Input renders on click; creates note in new folder to materialize it |

---

## Remaining Deferred Features (Low Priority)

| # | Feature | Reason Deferred |
|---|---------|----------------|
| M1 | **WYSIWYG editor mode** | TUI Editor is a heavy dependency (~200KB); SSR route prioritizes fast load. Can be added as lazy-loaded mode later. |
| M2 | **Editor mode persistence** | Requires metadata write on mode switch. Low impact — users typically use same mode. |
| M8 | **Share acceptance page** | Requires new route `(ssr)/ssr/notes/share/[id]/page.tsx`. Separate feature scope. |
| M9 | **Drag-to-reorder tabs** | Requires drag-and-drop library or complex pointer event handling. Low user impact. |
| M10 | **Drag & drop notes to folders** | Same as M9 — complex pointer event handling for minimal UX gain. |
| M14 | **Quick save utilities** | External-facing components (SaveToScratchButton, etc.) — separate feature scope. |
| M15 | **Quick notes sheet** | Compact editor for other pages — separate feature scope. |
| M17 | **Mobile auto-grow textarea** | CSS `field-sizing: content` already handles this in mobile CSS. |
| M18 | **Phantom note pattern** | SSR route uses NewNoteButton (creates real DB note); less frequent empty note creation. |
| M19 | **Realtime Postgres subscription** | SSR route uses background refresh (30s stale cache) instead. Can add later for real-time collaboration. |
| M22 | **Colored folder icons** | Cosmetic — default folder icons already have semantic meaning. |
| M24 | **Content search** | Requires fetching all note content on client or server-side full-text search. Separate optimization. |

---

## Bug Fixes & UX Improvements

| Fix | Description |
|-----|-------------|
| **Z-index stacking** | Added `z-index: 0` to `.notes-root` so content renders BEHIND shell header (z-40) and dock (z-40). Share dialog and mobile bottom sheet portaled to `document.body` to escape the stacking context. |
| **AI Actions debugging** | Underlying tables (`shortcut_categories`, `prompt_shortcuts`, `prompt_builtins`) are confirmed working in other parts of the system. Possible issues: (1) `context_menu_unified_view` or `get_ssr_shell_data` RPC may not be deployed yet — migration SQL added at `migrations/create_context_menu_unified_view.sql`; (2) `enabled_contexts` filtering with `"note-editor"` may filter out all items; (3) Redux hydration timing. NoteAiMenu now shows a clear error state when the view query fails. `ssrShellData.ts` gracefully handles missing RPC. Console.log diagnostics throughout data pipeline — check browser DevTools when clicking AI Actions. |
| **Context menu folder submenu** | Replaced flat folder list (unusable with 15+ folders) with collapsible "Move to folder ›" second tier in both NotesWorkspace and SidebarClient context menus. |
| **Tab bar folder selector** | Added folder icon button in active tab's action bar (next to Save/Copy/Share/Delete). Click to open dropdown for quick folder change. |
| **Mobile folder drawer** | Mobile bottom sheet now shows folder as clickable row with chevron. Tap to enter folder selection mode with back button navigation. |
| **Undefined CSS classes** | Fixed `notes-context-item`, `notes-context-item-danger`, `notes-context-divider` — these were never defined in CSS. Replaced with Tailwind utility classes matching `contextItemClass`. |

---

## Architecture Notes

All implemented features follow the SSR route's core principles:

1. **Server-rendered shell**: Layout.tsx renders synchronously — no auth, no DB, no async
2. **Client islands**: SidebarClient + NotesWorkspace are `"use client"` components
3. **Deep hydration**: Tags render as static badges immediately, add-tag input only on click. Folder dropdown renders button immediately, options on click. Mobile folder pills render all buttons immediately.
4. **Lazy loading**: MarkdownStream and NoteAiMenu use `dynamic()` with `ssr: false`
5. **Custom events**: Cross-component sync via `window.dispatchEvent()` for label/create/delete/move
6. **URL state**: Sort field, sort order, search query, folder filter, tabs all in URL params
7. **No backgrounds on floating elements**: Headers/search bar use glass/transparent overlays, content scrolls behind
8. **Suspense-free loading**: No `<Suspense>` wrappers — skeleton states handled inline with save state tracking
9. **Portal-based overlays**: Share dialog and mobile bottom sheet use `createPortal(jsx, document.body)` to escape the notes `z-index: 0` stacking context, ensuring they render above shell header/dock
