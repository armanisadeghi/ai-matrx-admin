# Notes actions (cross-app integration)

Source: `features/notes/actions/`. Import from `@/features/notes` (barrel re-exports) or `@/features/notes/actions` for explicit paths.

| Export | Purpose |
|--------|---------|
| **QuickCaptureButton** | Toolbar control that dispatches `openSaveToNotes` so `OverlayController` opens the global quick-save flow. Needs Redux + overlay stack. |
| **QuickNoteSaveModal** | Controlled dialog: edit content, pick folder, create vs update (append/overwrite). `OverlayController` wraps it with `NotesProvider` when opened globally. |
| **QuickSaveModal** | Alias of `QuickNoteSaveModal` — same component, shorter name for call sites. |
| **SaveToScratchButton** | One-click `NotesAPI.create` into the **Scratch** folder (no modal). |
| **SaveSelectionButton** | On click, reads `window.getSelection()`, saves to a folder (default Scratch), clears selection. |
| **QuickNotesButton** | Icon button calling `useQuickActions().openQuickNotes()` (opens quick-notes overlay). |
| **QuickNotesSheet** | In-overlay compact notes UI (editor + folder/note picker). Consumed by `OverlayController`; can be composed elsewhere inside `NotesProvider`. |
| **CategoryNotesModal** | Folder-scoped modal: list/search notes in one `folder_name`, optional create/edit/delete/import, `onSelectNote` for picking a note into another flow. Requires `NotesProvider` ancestor. |

**Also common (not in this folder):** many features call `openSaveToNotes` from `@/lib/redux/slices/overlaySlice` directly instead of using `QuickCaptureButton`.

---

## Usage map (reference examples)

Counts are **distinct files** that reference the symbol or mount the component (excluding the defining file and barrel `index.ts`). *Zero* means nothing imports it yet — the barrel still exports it for app-wide use.

| Export | Usages | Reference files |
|--------|--------|-----------------|
| **QuickCaptureButton** | 0 | — *(none yet)* |
| **QuickNoteSaveModal** | 1 | `components/overlays/OverlayController.tsx` (dynamic import + `NotesProvider` wrapper) |
| **QuickSaveModal** | 0 | — *(alias only; use `QuickNoteSaveModal` path above)* |
| **SaveToScratchButton** | 0 | — |
| **SaveSelectionButton** | 0 | — |
| **QuickNotesButton** | 0 | — |
| **QuickNotesSheet** | 1 | `components/overlays/OverlayController.tsx` (dynamic import + `NotesProvider` wrapper) |
| **CategoryNotesModal** | 2 | `app/(authenticated)/(admin-auth)/administration/official-components/component-displays/category-notes-modal.tsx`, `app/(authenticated)/(admin-auth)/administration/database/components/enhanced-sql-editor.tsx` |

### `openSaveToNotes` (same UX as QuickCaptureButton)

Used without `QuickCaptureButton` in **6** files:  
`features/chat/components/response/assistant-message/MessageOptionsMenu.tsx`,  
`features/public-chat/components/PublicMessageOptionsMenu.tsx`,  
`components/content-editor/ContentManagerMenu.tsx`,  
`components/official-candidate/voice-pad/components/VoicePadExpanded.tsx`,  
`features/cx-chat/actions/messageActionRegistry.ts`,  
`features/cx-conversation/actions/messageActionRegistry.ts`.

---

## Comment reference

`features/tasks/components/QuickTasksSheet.tsx` documents the same overlay pattern as **`features/notes/actions/QuickNotesSheet.tsx`**.
