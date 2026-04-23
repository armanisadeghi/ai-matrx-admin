/**
 * features/files/index.ts
 *
 * Public barrel. All external consumers MUST import from here (never from
 * feature subfolders) — prevents accidental coupling to internals.
 */

// Types — single source of truth
export * from "./types";

// REST API layer
export * as Api from "./api";
export { newRequestId } from "./api/client";

// Redux — slice, actions, selectors, thunks
export {
  cloudFilesReducer,
  // file actions
  upsertFile,
  upsertFiles,
  setFileField,
  resetFileField,
  markFileSaved,
  rollbackFileOptimisticUpdate,
  removeFile,
  setFileLoading,
  setFileError,
  // folder actions
  upsertFolder,
  upsertFolders,
  setFolderField,
  markFolderSaved,
  rollbackFolderOptimisticUpdate,
  removeFolder,
  // versions / permissions / shares / groups
  upsertVersionsForFile,
  upsertPermissionsForResource,
  removePermissionForResource,
  upsertShareLinksForResource,
  removeShareLink,
  upsertGroups,
  upsertGroupMembers,
  // tree
  setTreeStatus,
  replaceTree,
  markFolderFullyLoaded,
  attachChildToFolder,
  detachChildFromFolder,
  // selection + ui
  setSelection,
  clearSelection,
  toggleSelection,
  setViewMode,
  setSort,
  setActiveFileId,
  setActiveFolderId,
  // uploads
  trackUploadStart,
  updateUploadProgress,
  updateUploadStatus,
  clearUpload,
  clearCompletedUploads,
  // realtime
  setRealtimeStatus,
  resetCloudFilesState,
} from "./redux/slice";

export {
  loadUserFileTree,
  loadFolderContents,
  loadFileVersions,
  loadPermissions,
  loadShareLinks,
  reconcileTree,
  uploadFiles,
  clearUploadEntry,
  renameFile,
  moveFile,
  updateFileMetadata,
  deleteFile,
  restoreVersion,
  grantPermission,
  revokePermission,
  createShareLink,
  deactivateShareLink,
  getSignedUrl,
} from "./redux/thunks";

export * from "./redux/selectors";

export {
  attachCloudFilesRealtime,
  detachCloudFilesRealtime,
  cloudFilesRealtimeMiddleware,
} from "./redux/realtime-middleware";

// Providers
export { CloudFilesRealtimeProvider } from "./providers/CloudFilesRealtimeProvider";
