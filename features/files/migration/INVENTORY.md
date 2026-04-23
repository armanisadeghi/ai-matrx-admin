# Cloud Files Migration — Legacy ↔ New Inventory

Live map of every legacy file-handling surface in the repo and its new replacement. Status transitions: `legacy` → `replaced` → `deleted`.

**Update this file in the same PR as any consumer migration or component deletion.** Stale rows break the deletion gate in Phase 11.

---

## Status legend

- `legacy` — still wired up; callers may or may not exist.
- `replaced` — callers all migrated; component safe to delete; awaiting Phase 11.
- `deleted` — file removed from repo.

---

## Routes

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `app/(authenticated)/files/page.tsx` | `app/(a)/cloud-files/page.tsx` | legacy | Root files page |
| `app/(authenticated)/files/ClientFilesLayout.tsx` | `app/(a)/cloud-files/layout.tsx` | legacy | — |
| `app/(authenticated)/files/file-routes.config.ts` | (superseded by RPC tree) | legacy | Static bucket config |
| `app/(authenticated)/files/bucket/[bucket]/page.tsx` | `app/(a)/cloud-files/[[...path]]/page.tsx` | legacy | Bucket → folder path |
| `app/(authenticated)/files/components/FilteredFileView.tsx` | `features/files/components/core/FileList/` | legacy | — |
| `app/(authenticated)/files/mobile/` | `features/files/components/surfaces/MobileStack.tsx` | legacy | iOS push-nav |
| `app/(authenticated)/org/[slug]/files` | `app/(a)/cloud-files/` (scope by org) | legacy | Org-scoped files |

## Upload API routes (server-side)

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `app/api/images/upload` | backend `/files/upload` | legacy | Remove after consumers migrate |
| `app/api/code-files/upload` | backend `/files/upload` (via `lib/code-files/objectStore.ts`) | **replaced** | Migrated 2026-04-23. Routes + objectStore now write to `Code/Editor/{fileId}.txt` in cloud-files; `s3_bucket` column repurposed as sentinel (`cloud-files` vs legacy `code-editor`). Both formats coexist during the transition. |
| `app/api/agent-apps/generate-favicon` | backend `/files/upload` + share link | **replaced** | Migrated 2026-04-23. Favicon uploads to `Agent Apps/{appId}/favicon.svg` via the server client (explicit JWT) and persists a no-expiry share URL in `agent_apps.favicon_url`. |
| `app/api/podcasts/upload-assets` | backend `/files/upload` | legacy | — |
| `app/api/slack/upload*` | backend `/files/upload` | legacy | — |

## Components — upload/download

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `components/ui/file-upload/FileUploadWithStorage.tsx` | `features/files/components/core/FileUploadDropzone/` | legacy | Main upload w/ Supabase Storage |
| `components/ui/file-upload/file-upload.tsx` | `features/files/components/core/FileUploadDropzone/` | legacy | MiniFileUpload base |
| `components/ui/file-upload/ImageUploadField.tsx` | `features/files/components/core/FileUploadDropzone/` (image preset) | legacy | — |
| `components/ui/file-upload/useFileUploadWithStorage.ts` | `features/files/hooks/useFileUpload.ts` | legacy | — |
| `components/ui/file-upload/usePasteImageUpload.ts` | `features/files/hooks/useFileUpload.ts` (paste path) | legacy | — |
| `components/ui/file-upload/PasteImageHandler.tsx` | (absorbed into Dropzone) | legacy | — |
| `components/ui/file-upload/useClipboardPaste.ts` | (absorbed into Dropzone) | legacy | — |

## Components — preview

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `components/ui/file-preview/` (registry + type-specific) | `features/files/components/core/FilePreview/` | legacy | **Duplicate + curate** — widely used |
| `components/FileManager/FileManagerContent/FileMetadata.tsx` | `features/files/components/core/FileMeta/` | legacy | — |
| `components/FileManager/SmartComponents/FileMetadataCard.tsx` | `features/files/components/core/FileMeta/` (card variant) | legacy | — |
| `components/file-system/details/FileDetailsPanel.tsx` | `features/files/components/core/FileMeta/` (details variant) | legacy | — |

## Components — tree / directory

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `components/FileManager/` (8 files, TreeView + Bucket/Folder/File items) | `features/files/components/core/FileTree/` | legacy | **Duplicate + curate** — VS Code hierarchy |
| `components/file-system/draggable/FileTree.tsx` | `features/files/components/core/FileTree/` | legacy | **Duplicate** — dnd-kit patterns |
| `components/file-system/draggable/MultiBucketFileTree.tsx` | (scoped variant of new FileTree) | legacy | — |
| `components/file-system/` (misc draggable nodes, droppable targets) | `features/files/components/core/FileTree/` | legacy | — |
| `components/DirectoryTree/` (config + legacy tree) | `features/files/components/core/FileTree/` + `utils/icon-map.ts` | legacy | Icon config reused |
| `components/DirectoryTree/DirectoryTreePicker` | `features/files/components/pickers/FolderPicker.tsx` | legacy | — |
| `components/DirectoryTree/ActivePathTree` | (absorbed into FileTree) | legacy | — |
| BasicFolderTree / FileNameEditor / BucketSelector | (superseded) | legacy | Simple tree variants |

## Providers

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `lib/redux/fileSystem/Provider.tsx` | `features/files/providers/CloudFilesRealtimeProvider.tsx` | legacy | — |
| `providers/FileSystemProvider.tsx` | same | legacy | — |
| `providers/FilesPack.tsx` | same (unwire from `app/Providers.tsx`) | legacy | — |
| `components/file-system/preview/FilePreviewProvider.tsx` | (absorbed into new preview core) | legacy | — |

## Redux / state

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `lib/redux/fileSystem/slice.ts` | `features/files/redux/slice.ts` | legacy | Per-bucket factory → single slice |
| `lib/redux/fileSystem/thunks.ts` | `features/files/redux/thunks.ts` | legacy | — |
| `lib/redux/fileSystem/selectors.ts` | `features/files/redux/selectors.ts` | legacy | — |
| `lib/redux/fileSystem/types.ts` | `features/files/types.ts` | legacy | — |
| `lib/redux/fileSystem/sliceHelpers.ts` | (absorbed into slice.ts) | legacy | — |
| `lib/redux/fileSystem/thunkHelpers.ts` | (absorbed into thunks.ts) | legacy | — |
| `lib/redux/fileSystem/hooks.ts` (useTreeTraversal, useSelection, useFileOperations, etc.) | `features/files/hooks/` | legacy | — |
| `lib/redux/storage/` (storageSlice, storageThunks, storageMiddleware) | (superseded) | legacy | Remove when consumers migrate |

## Utilities

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `utils/supabase/file-store.ts` | `features/files/api/files.ts` | legacy | uploadFile/downloadFile/remove |
| `utils/supabase/StorageManager.ts` | N/A — delete | legacy | — |
| `utils/supabase/bucket-manager.ts` | N/A — delete | legacy | Complete CRUD + batch ops |
| `utils/file-operations/FileSystemManager.ts` | N/A — delete | legacy | — |
| `utils/file-operations/FileTypeManager.ts` | `features/files/utils/{icon-map,preview-capabilities,mime}.ts` | legacy | **Duplicate + curate** |
| `utils/file-operations/constants.ts` | `features/files/utils/icon-map.ts` | legacy | **Duplicate + curate** — icon map |
| `utils/file-operations/StorageBase.ts` | N/A — delete | legacy | — |
| `utils/file-operations/types.ts` | `features/files/types.ts` | legacy | — |
| `lib/code-files/objectStore.ts` | `features/files/api/files.ts` | legacy | — |

## Pickers / resource selectors

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `features/resource-manager/resource-picker/FilesResourcePicker.tsx` | rewritten in-place to use cloud-files tree | **replaced** | Migrated 2026-04-23. Same `{onBack,onSelect}` surface; internals now browse the cloud-files tree (top-level folders act as "buckets"). Returns a signed URL in `selection.url`. `allowedBuckets` repurposed as a folder-name filter. |

## Feature-specific upload surfaces

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `features/tasks/services/taskService.ts` (attachments) | `uploadFiles` thunk + `folderForTask()` | **replaced** | Migrated 2026-04-23. Uploads land under `Task Attachments/{taskId}/` (user-visible). `file_path` column now stores the cloud-files UUID; `getAttachmentUrl` is async and returns a signed URL. Legacy rows (non-UUID `file_path`) still open via the old public-URL fallback. `TaskAttachments.tsx` updated to await the URL. |
| `features/audio/services/audioFallbackUpload.ts` | `uploadFiles` thunk | **replaced** | Migrated 2026-04-23. Uploads via cloud-files REST, transcribes via signed URL, hard-deletes on completion. |
| Slack upload flows | `uploadFiles` thunk | legacy | — |
| Broker upload flows | `uploadFiles` thunk | legacy | — |
| Chat/Prompt upload flows | `uploadFiles` thunk | legacy | — |
| PDF extractor upload | `uploadFiles` thunk | legacy | — |
| Window-panel upload surfaces | `uploadFiles` thunk | legacy | — |

## Direct `supabase.storage.*` call sites

These must all migrate; grep pattern: `supabase.storage.from` / `storage.upload` / `storage.download` / `storage.createSignedUrl` / `storage.list` / `storage.remove`.

| Location | Status |
|---|---|
| `lib/redux/fileSystem/api.ts:44` (list buckets) | legacy |
| `lib/redux/fileSystem/thunks.ts:506,514,618` (remove, download) | legacy |
| `utils/supabase/file-store.ts` (all methods) | legacy |
| `utils/supabase/StorageManager.ts` (getBucket, listBuckets) | legacy |
| `utils/supabase/bucket-manager.ts` (all methods) | legacy |
| `utils/file-operations/FileSystemManager.ts` (listBuckets) | legacy |
| `features/tasks/services/taskService.ts` (getPublicUrl, remove) | **replaced** |
| `features/audio/services/audioFallbackUpload.ts` (remove) | **replaced** |
| `features/resource-manager/resource-picker/FilesResourcePicker.tsx` (listBuckets) | **replaced** |
| `lib/code-files/objectStore.ts` (remove ops) | **replaced** |

---

## Consumer dependency scan — to be filled

Phase 0 leaves this section stubbed. Phase 1/2 leads must grep:

```bash
# Legacy provider consumers
grep -rn "useFileSystem\b" --include='*.ts' --include='*.tsx'
grep -rn "FileSystemProvider" --include='*.ts' --include='*.tsx'
grep -rn "FilesPack" --include='*.ts' --include='*.tsx'

# Legacy redux consumers
grep -rn "lib/redux/fileSystem" --include='*.ts' --include='*.tsx'

# Legacy utilities
grep -rn "utils/supabase/file-store" --include='*.ts' --include='*.tsx'
grep -rn "utils/supabase/bucket-manager" --include='*.ts' --include='*.tsx'
grep -rn "utils/file-operations/FileTypeManager" --include='*.ts' --include='*.tsx'

# Direct supabase.storage
grep -rn "supabase.storage" --include='*.ts' --include='*.tsx'
```

Results (per-caller) go in a section below with path + one-line usage description. Expect ~65 callers. Blast-radius ordering drives Phase 9 work.

| Caller | Legacy surface used | Replacement plan | Status |
|---|---|---|---|
| *(tbd — populate in Phase 1/2)* | — | — | — |

---

## Rules for updating this file

1. Any new file added under `features/files/` that replaces a legacy file → add the row here.
2. Any consumer migrated → flip its row to `replaced`.
3. Any legacy file deleted → flip its row to `deleted`.
4. Any new legacy surface discovered mid-migration → add a `legacy` row with a replacement plan.

Review this file at the start and end of every files-related PR.
