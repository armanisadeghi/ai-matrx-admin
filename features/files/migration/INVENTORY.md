# Cloud Files Migration — Legacy ↔ New Inventory

Live map of every legacy file-handling surface in the repo and its new replacement. Status transitions: `legacy` → `replaced` → `deleted`.

**Update this file in the same PR as any consumer migration or component deletion.** Stale rows break the deletion gate in Phase 11.

As of **2026-04-23** the migration is **complete** — every legacy surface under `lib/redux/fileSystem/`, `lib/redux/storage/`, `components/FileManager/`, `components/file-system/`, `components/DirectoryTree/`, `components/ui/file-preview/`, `providers/FileSystemProvider.tsx`, `providers/packs/FilesPack.tsx`, `utils/supabase/{file-store,StorageManager,bucket-manager}.ts`, and `utils/file-operations/{FileSystemManager,FileTypeManager,StorageBase,urlRefreshUtils}.ts` has been **deleted**. The one surviving "legacy" route handler is `/api/images/upload`, which was **migrated in place** — the contract is intact but its internals now go through cloud-files.

---

## Status legend

- `legacy` — still wired up; callers may or may not exist.
- `replaced` — callers all migrated; component safe to delete; awaiting Phase 11.
- `deleted` — file removed from repo.

---

## Routes

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `app/(authenticated)/files/page.tsx` | `app/(a)/cloud-files/page.tsx` | **deleted** | Entire `app/(authenticated)/files/` tree removed 2026-04-23 |
| `app/(authenticated)/files/ClientFilesLayout.tsx` | `app/(a)/cloud-files/layout.tsx` | **deleted** | — |
| `app/(authenticated)/files/file-routes.config.ts` | (superseded by RPC tree) | **deleted** | — |
| `app/(authenticated)/files/bucket/[bucket]/page.tsx` | `app/(a)/cloud-files/[[...path]]/page.tsx` | **deleted** | — |
| `app/(authenticated)/files/components/FilteredFileView.tsx` | `features/files/components/core/FileList/` | **deleted** | — |
| `app/(authenticated)/files/mobile/` | `features/files/components/surfaces/MobileStack.tsx` | **deleted** | iOS push-nav |
| `app/(authenticated)/(admin-auth)/administration/system-files/` | — | **deleted** | admin-only view of legacy buckets |
| `app/(authenticated)/(admin-auth)/administration/file-explorer/` | — | **deleted** | — |
| `app/(authenticated)/org/[slug]/files` | `app/(a)/cloud-files/` (scope by org) | **deleted** | Org-scoped files |

## Upload API routes (server-side)

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `app/api/images/upload` | same route, now cloud-files-backed internally | **replaced** | Migrated 2026-04-23 (Phase C6). Contract unchanged. Sharp still runs server-side; each variant now uploads via `ServerFiles.uploadAndShare` to `Images/<folder-or-Generated>/<uuid>/<suffix>.jpg` and returns permanent share URLs. Response `bucket` field always returns `"cloud-files"` now. |
| `app/api/code-files/upload` | backend `/files/upload` (via `lib/code-files/objectStore.ts`) | **replaced** | Migrated 2026-04-23. Routes + objectStore now write to `Code/Editor/{fileId}.txt` in cloud-files; `s3_bucket` column repurposed as sentinel (`cloud-files` vs legacy `code-editor`). Both formats coexist during the transition. |
| `app/api/agent-apps/generate-favicon` | backend `/files/upload` + share link | **replaced** | Migrated 2026-04-23. Favicon uploads to `Agent Apps/{appId}/favicon.svg` via the server client (explicit JWT) and persists a no-expiry share URL in `agent_apps.favicon_url`. |
| `app/api/podcasts/upload-assets` | Python `/media/podcast/upload-video` (video) + `/api/images/upload` (image) | **deleted** | Deleted 2026-04-23. Had zero runtime callers — video pipeline now goes directly to Python via `useBackendApi`, image pipeline delegated to `ImageAssetUploader` / `/api/images/upload`. The `UploadAssetsResponse` type was copied inline into `features/podcasts/components/admin/AssetUploader.tsx`. |
| `app/api/slack/upload` | (kept as-is) | n/a | NOT a file-system route. Slack integration that uploads to Slack (not to our storage). Out of scope for this migration. |
| `app/api/slack/upload-external` | (kept as-is) | n/a | Same — Slack external-upload flow. Out of scope. |
| `app/api/slack/upload-broker` | (kept as-is) | n/a | Same — Slack broker flow. Out of scope. |

## Components — upload/download

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `components/ui/file-upload/FileUploadWithStorage.tsx` | `features/files/components/core/FileUploadDropzone/` | legacy | Main upload w/ Supabase Storage — hook internals rewritten to route through cloud-files + share-link while preserving the public signature so ~14 consumers keep working unchanged. |
| `components/ui/file-upload/file-upload.tsx` | `features/files/components/core/FileUploadDropzone/` | legacy | MiniFileUpload base |
| `components/ui/file-upload/ImageUploadField.tsx` | `features/files/components/core/FileUploadDropzone/` (image preset) | legacy | — |
| `components/ui/file-upload/useFileUploadWithStorage.ts` | `features/files/hooks/useFileUpload.ts` | **replaced** | In-place rewrite 2026-04-23: public signature preserved, internals now use cloud-files + share links. `mapLegacyBucket()` maps legacy bucket names to folder paths. |
| `components/ui/file-upload/usePasteImageUpload.ts` | `features/files/hooks/useFileUpload.ts` (paste path) | legacy | — |
| `components/ui/file-upload/PasteImageHandler.tsx` | (absorbed into Dropzone) | legacy | — |
| `components/ui/file-upload/useClipboardPaste.ts` | (absorbed into Dropzone) | legacy | — |

## Components — preview

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `components/ui/file-preview/` (registry + type-specific) | `features/files/components/core/FilePreview/` | **deleted** | Entire directory removed 2026-04-23 |
| `components/FileManager/FileManagerContent/FileMetadata.tsx` | `features/files/components/core/FileMeta/` | **deleted** | — |
| `components/FileManager/SmartComponents/FileMetadataCard.tsx` | `features/files/components/core/FileMeta/` (card variant) | **deleted** | — |
| `components/file-system/details/FileDetailsPanel.tsx` | `features/files/components/core/FileMeta/` (details variant) | **deleted** | — |

## Components — tree / directory

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `components/FileManager/` (8 files, TreeView + Bucket/Folder/File items) | `features/files/components/core/FileTree/` | **deleted** | VS Code hierarchy — removed 2026-04-23 |
| `components/file-system/draggable/FileTree.tsx` | `features/files/components/core/FileTree/` | **deleted** | dnd-kit patterns |
| `components/file-system/draggable/MultiBucketFileTree.tsx` | (scoped variant of new FileTree) | **deleted** | — |
| `components/file-system/` (misc draggable nodes, droppable targets) | `features/files/components/core/FileTree/` | **deleted** | — |
| `components/DirectoryTree/` (config + legacy tree) | `features/files/components/core/FileTree/` + `utils/icon-map.ts` | **deleted** | Icon config copied into new code |
| `components/DirectoryTree/DirectoryTreePicker` | `features/files/components/pickers/FolderPicker.tsx` | **deleted** | — |
| `components/DirectoryTree/ActivePathTree` | (absorbed into FileTree) | **deleted** | — |
| BasicFolderTree / FileNameEditor / BucketSelector | (superseded) | **deleted** | Simple tree variants |

## Providers

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `lib/redux/fileSystem/Provider.tsx` | `features/files/providers/CloudFilesRealtimeProvider.tsx` | **deleted** | — |
| `providers/FileSystemProvider.tsx` | same | **deleted** | Removed from `app/Providers.tsx` + file deleted |
| `providers/packs/FilesPack.tsx` | same (unwired from `app/Providers.tsx`) | **deleted** | — |
| `components/file-system/preview/FilePreviewProvider.tsx` | (absorbed into new preview core) | **deleted** | — |

## Redux / state

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `lib/redux/fileSystem/slice.ts` | `features/files/redux/slice.ts` | **deleted** | Per-bucket factory → single slice |
| `lib/redux/fileSystem/thunks.ts` | `features/files/redux/thunks.ts` | **deleted** | — |
| `lib/redux/fileSystem/selectors.ts` | `features/files/redux/selectors.ts` | **deleted** | — |
| `lib/redux/fileSystem/types.ts` | `features/files/types.ts` | **deleted** | — |
| `lib/redux/fileSystem/sliceHelpers.ts` | (absorbed into slice.ts) | **deleted** | — |
| `lib/redux/fileSystem/thunkHelpers.ts` | (absorbed into thunks.ts) | **deleted** | — |
| `lib/redux/fileSystem/hooks.ts` (useTreeTraversal, useSelection, useFileOperations, etc.) | `features/files/hooks/` | **deleted** | — |
| `lib/redux/storage/` (storageSlice, storageThunks, storageMiddleware) | (superseded) | **deleted** | Reducer + middleware both unwired from `store.ts` |
| `lib/redux/middleware/actionInterceptor.ts` | N/A | **deleted** | Referenced `storageSlice`; no longer needed |

## Utilities

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `utils/supabase/file-store.ts` | `features/files/api/files.ts` | **deleted** | uploadFile/downloadFile/remove |
| `utils/supabase/StorageManager.ts` | N/A — delete | **deleted** | — |
| `utils/supabase/bucket-manager.ts` | N/A — delete | **deleted** | Complete CRUD + batch ops |
| `utils/file-operations/FileSystemManager.ts` | N/A — delete | **deleted** | — |
| `utils/file-operations/FileTypeManager.ts` | `features/files/utils/{icon-map,preview-capabilities,mime}.ts` | **deleted** | Curated copy lives in the new module |
| `utils/file-operations/constants.ts` | `features/files/utils/icon-map.ts` | legacy | Trimmed in place: `BUCKET_DEFAULTS`, `getBucketDetails`, and `MatrxIcon` refs removed. Still holds the `EnhancedFileDetails` type + a few helpers (`getFileDetailsByName`, `getFileDetailsByUrl`) used by non-file-system callers. |
| `utils/file-operations/StorageBase.ts` | N/A — delete | **deleted** | — |
| `utils/file-operations/urlRefreshUtils.ts` | N/A — delete | **deleted** | Supabase-Storage URL refresh logic; obsolete |
| `utils/file-operations/types.ts` | `features/files/types.ts` | **deleted** | — |
| `lib/code-files/objectStore.ts` | `features/files/api/files.ts` | **replaced** | Now uploads to cloud-files `Code/Editor/{fileId}.txt` via the server client; sentinel `s3_bucket = 'cloud-files'` distinguishes new rows from legacy. |

## Pickers / resource selectors

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `features/resource-manager/resource-picker/FilesResourcePicker.tsx` | rewritten in-place to use cloud-files tree | **replaced** | Migrated 2026-04-23. Same `{onBack,onSelect}` surface; internals now browse the cloud-files tree (top-level folders act as "buckets"). Returns a signed URL in `selection.url`. `allowedBuckets` repurposed as a folder-name filter. |

## Feature-specific upload surfaces

| Legacy path | New path | Status | Notes |
|---|---|---|---|
| `features/tasks/services/taskService.ts` (attachments) | `uploadFiles` thunk + `folderForTask()` | **replaced** | Migrated 2026-04-23. Uploads land under `Task Attachments/{taskId}/` (user-visible). `file_path` column now stores the cloud-files UUID; `getAttachmentUrl` is async and returns a signed URL. Legacy rows (non-UUID `file_path`) still open via the old public-URL fallback. `TaskAttachments.tsx` updated to await the URL. |
| `features/audio/services/audioFallbackUpload.ts` | `uploadFiles` thunk | **replaced** | Migrated 2026-04-23. Uploads via cloud-files REST, transcribes via signed URL, hard-deletes on completion. |
| `features/quick-actions/components/QuickFilesSheet.tsx` | (deprecated; Files tab → `/cloud-files`) | **deleted** | — |
| `features/window-panels/windows/files/*` (QuickFiles, FileUpload, FilePreview windows) | `features/window-panels/windows/CloudFilesWindow.tsx` | **deleted** | Old window surfaces removed; tools-grid tiles now point at `cloudFilesWindow`. |
| `features/administration/file-explorer/` | `/cloud-files` route | **deleted** | — |
| `components/GlobalContextMenu/version-one/` (preview-menu etc.) | New command palette + Files nav | **deleted** | — |
| Chat/Prompt upload flows (`PromptInputContainer`) | `useFileManagement` + inline chips | **replaced** | Legacy `FileChipsWithPreview` replaced with inline chips — same shape, removes the `components/ui/file-preview` dep. |
| Image grids (`components/image/shared/*`) | `window.open` signed URL | **replaced** | Previews open in a new tab until an embedded `FilePreview` is wired through cloud-files signed URLs. |
| PDF extractor (`features/pdf-extractor`) | `window.open` signed URL | **replaced** | `handleViewOriginal` now uses `window.open` instead of the old `openFilePreview` API. |
| Resource preview (`features/prompts/components/resource-display/ResourcePreviewSheet.tsx`) | `window.open` for file types | **replaced** | Same pattern. |

## Direct `supabase.storage.*` call sites

These must all migrate; grep pattern: `supabase.storage.from` / `storage.upload` / `storage.download` / `storage.createSignedUrl` / `storage.list` / `storage.remove`.

As of 2026-04-23, all previously listed call sites either live in deleted modules or were rewritten to use cloud-files.

| Location | Status |
|---|---|
| `lib/redux/fileSystem/api.ts` | **deleted** |
| `lib/redux/fileSystem/thunks.ts` | **deleted** |
| `utils/supabase/file-store.ts` | **deleted** |
| `utils/supabase/StorageManager.ts` | **deleted** |
| `utils/supabase/bucket-manager.ts` | **deleted** |
| `utils/file-operations/FileSystemManager.ts` | **deleted** |
| `features/tasks/services/taskService.ts` | **replaced** (no longer touches `supabase.storage`) |
| `features/audio/services/audioFallbackUpload.ts` | **replaced** |
| `features/resource-manager/resource-picker/FilesResourcePicker.tsx` | **replaced** |
| `lib/code-files/objectStore.ts` | **replaced** |

---

## Rules for updating this file

1. Any new file added under `features/files/` that replaces a legacy file → add the row here.
2. Any consumer migrated → flip its row to `replaced`.
3. Any legacy file deleted → flip its row to `deleted`.
4. Any new legacy surface discovered mid-migration → add a `legacy` row with a replacement plan.

Review this file at the start and end of every files-related PR.
