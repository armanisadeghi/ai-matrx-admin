# Provider usage map

Derived from repo-wide search (`useAudioModal`, `showAudioModal`, `useFileSystem`, `useToastManager`, etc.). **StoreProvider omitted** per request.

Non-light providers follow the classifications in `app/PROVIDED-ANALYSIS.md` (anything other than **Light** on import or mount, excluding StoreProvider).

---

## `AudioModalProvider` (`providers/AudioModalProvider.tsx`)

**Loads classification:** Medium import / Light mount.

### Where the provider is mounted

| Location | Notes |
|----------|--------|
| `app/Providers.tsx` | Main authenticated shell |
| `providers/packs/MediaPack.tsx` | Alternate pack wrapper (`MediaPack` is exported from `providers/packs/index.ts` but **no route layout currently imports `MediaPack`**; primary mount is `Providers.tsx`) |

### Registration bridge

`AudioModalProvider` calls `registerAudioModal()` in `utils/audio/audioModal.ts`. Code can open the modal either:

- **`useAudioModal()`** — must run under the provider, or
- **`showAudioModal()`** from `@/utils/audio/audioModal` — uses the registered function (still requires the provider to have mounted once).

### Direct API consumers

| File | Mechanism |
|------|-----------|
| `hooks/tts/useAudioExplanation.ts` | `useAudioModal()` |
| `hooks/flashcard-app/useFlashcard.ts` | `showAudioModal()` (intro / outro / active card / custom text) |
| `components/audio/example-usage.tsx` | Demo: `useAudioExplanation` + imperative `showAudioModal` |

### Indirect consumers (flashcard stack → `useFlashcard`)

Components that take or call into `useFlashcard` (and thus can trigger the audio modal via `audioModalActions`):

- `components/flashcard-app/flashcard-display/flashcard-display.tsx`
- `components/flashcard-app/components/SmartFlashcardControls/SmartFlashcardControls.tsx`
- `components/flashcard-app/components/SmartFlashcardControls/SmartActionButtons.tsx` (also calls `useFlashcard([])` internally)
- `components/flashcard-app/components/SmartFlashcardControls/types.ts` (types only)
- `components/flashcard-app/components/FlashcardControls.tsx`
- `components/flashcard-app/components/FlashcardComponentDesktop.tsx`
- `components/flashcard-app/components/FlashcardComponentMobile.tsx`
- `app/(authenticated)/flash-cards/components/FlashcardControls.tsx`
- `app/(authenticated)/flash-cards/components/FlashcardComponentMobile.tsx`
- `app/(authenticated)/flash-cards/components/FlashcardComponent.tsx`
- `types/flashcards.types.ts` (`FlashcardHook` type)

### Routes that host flashcard UIs using this hook

| Route | Entry |
|-------|--------|
| `app/(authenticated)/flashcard/[category]/[id]/page.tsx` | `FlashcardComponent` (`components/flashcard-app/components/FlashcardComponent.tsx`) |
| `app/(authenticated)/flash-cards/page.tsx` | Local `FlashcardComponent` under `flash-cards/components/` |

**Note:** `features/flashcards/hooks/useFlashcardStudy.ts` / `CanvasFlashcardsView` do **not** call `showAudioModal`; they are separate from the `useFlashcard` audio path.

---

## `FileSystemProvider` — Redux (`lib/redux/fileSystem/Provider.tsx`)

**Loads classification:** Medium import / Light mount.

**Mount:** `app/Providers.tsx`, `providers/packs/FilesPack.tsx` (pack not referenced by any `layout.tsx` today).

**Consumers** (`useFileSystem` or provider import from `@/lib/redux/fileSystem/Provider`):

- `app/Providers.tsx`
- `providers/packs/FilesPack.tsx`
- `app/(authenticated)/files/bucket/[bucket]/page.tsx`
- `features/window-panels/windows/FileUploadWindow.tsx`
- `components/file-system/details/FileDetailsPanel.tsx`
- `components/file-system/tree/NodeItem.tsx`
- `components/file-system/tree/FileTree.tsx`
- `components/file-system/tree/BucketSelector.tsx`
- `components/file-system/tree/BasicFolderTree.tsx`
- `components/file-system/tree/ActivePathTree.tsx`
- `components/file-system/draggable/NodeItem.tsx`
- `components/file-system/draggable/MultiBucketFileTree.tsx`
- `components/file-system/draggable/FileTree.tsx`
- `components/file-system/context-menu/FileContextMenu.tsx`

Related types/slices used without `useFileSystem` on many files pages (mobile, admin system-files, etc.) — those still assume the **Redux file-system slices** exist when wrapped by this provider in the main shell.

---

## `FileSystemProvider` — legacy (`providers/FileSystemProvider.tsx`)

**Loads classification:** Medium import / **Heavy** mount (per `PROVIDED-ANALYSIS.md`).

**Mount:** `app/Providers.tsx`, `providers/packs/FilesPack.tsx`.

**Consumers** (`useFileSystem` from `@/providers/FileSystemProvider`):

- `app/Providers.tsx`
- `providers/packs/FilesPack.tsx`
- `components/FileManager/index.tsx`
- `components/FileManager/FileManagerHeader.tsx`
- `components/FileManager/FileManagerContent/index.tsx`
- `components/FileManager/FileManagerContent/FileList.tsx`
- `components/FileManager/FileManagerContent/FileMetadata.tsx`
- `components/FileManager/FileManagerContent/FilePreview.tsx`
- `components/FileManager/FileExplorerGrid/index.tsx`
- `components/FileManager/FileExplorerGrid/FileCard.tsx`
- `components/FileManager/TreeView/index.tsx`
- `components/FileManager/TreeView/concepts/useDirectoryTree.ts`
- `components/FileManager/TreeView/concepts/BucketSelector.tsx`
- `components/FileManager/TreeView/TreeItemBucket.tsx`
- `components/FileManager/TreeView/TreeItemFile.tsx`
- `components/FileManager/TreeView/TreeitemFolder.tsx`
- `components/FileManager/FilePreview/index.tsx`
- `components/FileManager/FilePreview/SpreadsheetPreview.tsx`
- `components/FileManager/FilePreview/AudioPreview.tsx`
- `components/FileManager/FilePreview/CodePreview.tsx`
- `components/FileManager/FilePreview/DefaultPreview.tsx`
- `components/FileManager/FilePreview/ImagePreview.tsx`
- `components/FileManager/FilePreview/MarkdownPreview.tsx`
- `components/FileManager/FilePreview/PDFPreview.tsx`
- `components/FileManager/FilePreview/TextPreview.tsx`
- `components/FileManager/FilePreview/VideoPreview.tsx`
- `components/FileManager/Dialogs/FileSystemDialogProvider.tsx`
- `components/FileManager/Dialogs/DeleteDialog.tsx`
- `components/FileManager/Dialogs/MoveDialog.tsx`
- `components/FileManager/Dialogs/RenameDialog.tsx`
- `components/FileManager/ContextMenus/BucketContextMenu.tsx`
- `components/FileManager/ContextMenus/FileContextMenu.tsx`
- `components/FileManager/ContextMenus/FolderContextMenu.tsx`
- `components/FileManager/SmartComponents/FileMetadataCard.tsx`
- `components/file-system/context-menu.tsx`
- `components/GlobalContextMenu/version-one/hooks/useFileContextMenu.ts`

**Also:** `providers/FileSystemProvider.tsx` imports `useToastManager("storage")`, coupling legacy FS UI to toast defaults.

---

## `ToastProvider` (`providers/toast-context.tsx`)

**Loads classification:** Light import / **Light-Med** mount (wires `toast.setFunctions` in `useEffect`).

There is no single “route list”: most surfaces use `useToast` from `@/components/ui/use-toast` (requires `<Toaster />` sibling in `Providers.tsx`) or imperative `toast` from `@/lib/toast-service` after `ToastProvider` has run its effect.

### Direct context consumers (`useToastManager` → `ToastContext`)

| File |
|------|
| `hooks/useToastManager.tsx` (definition) |
| `providers/FileSystemProvider.tsx` |
| `features/tasks/context/TaskContext.tsx` |
| `features/notes/components/NotesLayout.tsx` |
| `features/notes/components/NoteEditor.tsx` |
| `features/notes/components/mobile/MobileNoteEditor.tsx` |
| `features/notes/components/mobile/MobileActionsMenu.tsx` |
| `features/notes/components/mobile/NoteEditorDock.tsx` |
| `features/notes/actions/QuickNotesSheet.tsx` |
| `features/notes/actions/SaveToScratchButton.tsx` |
| `features/notes/actions/SaveSelectionButton.tsx` |
| `features/notes/actions/QuickNoteSaveModal.tsx` |
| `app/(authenticated)/notes-dep/share/[id]/page.tsx` |
| `app/(ssr)/ssr/normal-notes/share/[id]/page.tsx` |
| `app/(authenticated)/notes-dep/experimental/diff/page.tsx` |
| `app/(ssr)/ssr/normal-notes/experimental/diff/page.tsx` |
| `features/text-diff/components/DiffHistory.tsx` |
| `features/text-diff/hooks/useDiffHandler.ts` |
| `features/user-lists/components/ListDetailClient.tsx` |
| `features/user-lists/components/ListsTreeNav.tsx` |
| `features/user-lists/components/ListsTableView.tsx` |
| `features/user-lists/components/ListItemsTableView.tsx` |
| `features/user-lists/components/CreateListDialog.tsx` |
| `features/user-lists/components/AddItemDialog.tsx` |
| `features/user-lists/components/EditItemDialog.tsx` |
| `features/user-lists/components/EditListDialog.tsx` |
| `features/transcripts/components/TranscriptsHeader.tsx` |
| `features/transcripts/components/TranscriptViewer.tsx` |
| `features/transcripts/components/CreateTranscriptModal.tsx` |
| `features/transcripts/components/ImportTranscriptModal.tsx` |
| `features/transcripts/components/DeleteTranscriptDialog.tsx` |
| `features/tasks/components/TaskDetailPage.tsx` |
| `features/applet/runner/AppletRunComponent.tsx` |
| `components/mardown-display/tables/MarkdownTable.tsx` |
| `components/mardown-display/tables/StreamingTableRenderer.tsx` |
| `components/mardown-display/tables/TableWithSeparatedControls.tsx` |
| `components/mardown-display/tables/SaveTableModal.tsx` |
| `components/mardown-display/tables/EditableTable.tsx` |
| `app/(authenticated)/files/mobile/MobileFileUpload.tsx` |
| `app/(authenticated)/demo/component-demo/toast-demo/page.tsx` |

### Other coupling

- `lib/redux/sagas/storage/storageSyncSaga.ts` — `toast.registerDefaults('storage', …)` (expects toast service + provider lifecycle).

Imperative `toast` from `@/lib/toast-service` is also imported in many feature components (agents, prompts, prompt-apps, recipes, etc.); those calls assume `ToastProvider` has initialized the service.

---

## `DeferredSingletons` (`app/DeferredSingletons.tsx`)

**Loads classification:** Medium import / Light mount (idle-gated; returns `null` until `useIdleReady()`).

**Mount:** `app/Providers.tsx` only.

No public hook. **Rendered subtrees** (after idle ready):

| Component | Path |
|-----------|------|
| `PersistentDOMConnector` | `providers/persistance/PersistentDOMConnector` |
| `OverlayController` | `components/overlays/OverlayController` |
| `AudioRecoveryToast` | `features/audio/components/AudioRecoveryToast` |
| `AuthSessionWatcher` | `components/layout/AuthSessionWatcher` |
| `AnnouncementProvider` | `components/layout/AnnouncementProvider` |
| `AdminFeatureProvider` | `features/admin/AdminFeatureProvider` |

**Side effects** (idle tasks in same file): broker registration, broker values from `user` slice, `loadPreferences`, PostHog `identifyUser`.

---

## Skipped (per request)

- **StoreProvider** — not enumerated here.

## Fully “Light” providers in `PROVIDED-ANALYSIS.md`

Not expanded in this file: `ReactQueryProvider`, `ThemeProvider`, `PersistentComponentProvider`, `ContextMenuProvider`, `RefProvider`, `FilePreviewProvider`, `TooltipProvider`, `ModuleHeaderProvider`, `UniformHeightProvider`, `SelectedImagesProvider`, `TaskProvider`, `TranscriptsProvider`, `AudioRecoveryProvider`.
