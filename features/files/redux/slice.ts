/**
 * features/files/redux/slice.ts
 *
 * Normalized cloud-files slice. Pattern: copied from
 * features/agents/redux/agent-shortcuts/slice.ts — dirty-tracking via
 * FieldFlags, optimistic + rollback via _fieldHistory, RTK reducers only
 * (async logic lives in thunks.ts).
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  addField,
  createFieldFlags,
  hasField,
  removeField,
} from "@/features/agents/redux/shared/field-flags";
import type {
  CloudFile,
  CloudFileFieldSnapshot,
  CloudFilePermission,
  CloudFileRecord,
  CloudFilesState,
  CloudFileVersion,
  CloudFolder,
  CloudFolderFieldSnapshot,
  CloudFolderRecord,
  CloudShareLink,
  CloudUserGroup,
  CloudUserGroupMember,
  SelectionState,
  SortBy,
  SortDirection,
  TreeChildren,
  UploadState,
  UploadStatus,
  ViewMode,
  Visibility,
} from "../types";

// ---------------------------------------------------------------------------
// Record factories
// ---------------------------------------------------------------------------

function emptyFileRecord(id: string): CloudFileRecord {
  return {
    id,
    ownerId: "",
    filePath: "",
    storageUri: "",
    fileName: "",
    mimeType: null,
    fileSize: null,
    checksum: null,
    visibility: "private",
    currentVersion: 1,
    parentFolderId: null,
    metadata: {},
    createdAt: "",
    updatedAt: "",
    deletedAt: null,

    _dirty: false,
    _dirtyFields: createFieldFlags<keyof CloudFile>(),
    _fieldHistory: {},
    _loadedFields: createFieldFlags<keyof CloudFile>(),
    _loading: false,
    _error: null,
    _pendingRequestIds: [],
  };
}

function emptyFolderRecord(id: string): CloudFolderRecord {
  return {
    id,
    ownerId: "",
    folderPath: "",
    folderName: "",
    parentId: null,
    visibility: "private",
    metadata: {},
    createdAt: "",
    updatedAt: "",
    deletedAt: null,

    _dirty: false,
    _dirtyFields: createFieldFlags<keyof CloudFolder>(),
    _fieldHistory: {},
    _loadedFields: createFieldFlags<keyof CloudFolder>(),
    _loading: false,
    _error: null,
    _pendingRequestIds: [],
  };
}

// ---------------------------------------------------------------------------
// Merge helpers — apply a fetched partial onto a record without touching
// runtime flags, and track which fields have been loaded.
// ---------------------------------------------------------------------------

function mergeFileIntoRecord(
  record: CloudFileRecord,
  partial: Partial<CloudFile>,
): void {
  (Object.keys(partial) as (keyof CloudFile)[]).forEach((key) => {
    if (partial[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (record as any)[key] = partial[key];
      addField(record._loadedFields, key);
    }
  });
}

function mergeFolderIntoRecord(
  record: CloudFolderRecord,
  partial: Partial<CloudFolder>,
): void {
  (Object.keys(partial) as (keyof CloudFolder)[]).forEach((key) => {
    if (partial[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (record as any)[key] = partial[key];
      addField(record._loadedFields, key);
    }
  });
}

function applyFileFieldEdit<K extends keyof CloudFile>(
  record: CloudFileRecord,
  field: K,
  value: CloudFile[K],
): void {
  if (!hasField(record._dirtyFields, field)) {
    // Only snapshot if this field is tracked in the snapshot shape.
    if (
      field === "fileName" ||
      field === "filePath" ||
      field === "visibility" ||
      field === "parentFolderId" ||
      field === "metadata" ||
      field === "deletedAt"
    ) {
      (record._fieldHistory as CloudFileFieldSnapshot)[
        field as keyof CloudFileFieldSnapshot
      ] = record[field as keyof CloudFileFieldSnapshot] as never;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (record as any)[field] = value;
  addField(record._dirtyFields, field);
  record._dirty = true;
}

function applyFolderFieldEdit<K extends keyof CloudFolder>(
  record: CloudFolderRecord,
  field: K,
  value: CloudFolder[K],
): void {
  if (!hasField(record._dirtyFields, field)) {
    if (
      field === "folderName" ||
      field === "folderPath" ||
      field === "parentId" ||
      field === "visibility" ||
      field === "metadata"
    ) {
      (record._fieldHistory as CloudFolderFieldSnapshot)[
        field as keyof CloudFolderFieldSnapshot
      ] = record[field as keyof CloudFolderFieldSnapshot] as never;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (record as any)[field] = value;
  addField(record._dirtyFields, field);
  record._dirty = true;
}

function markFileClean(record: CloudFileRecord): void {
  record._dirty = false;
  record._dirtyFields = createFieldFlags<keyof CloudFile>();
  record._fieldHistory = {};
  record._error = null;
}

function markFolderClean(record: CloudFolderRecord): void {
  record._dirty = false;
  record._dirtyFields = createFieldFlags<keyof CloudFolder>();
  record._fieldHistory = {};
  record._error = null;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: CloudFilesState = {
  filesById: {},
  foldersById: {},
  versionsByFileId: {},
  permissionsByResourceId: {},
  shareLinksByResourceId: {},
  groupsById: {},
  groupMembersByGroupId: {},

  tree: {
    rootFolderIds: [],
    rootFileIds: [],
    childrenByFolderId: {},
    fullyLoadedFolderIds: {},
    status: "idle",
    error: null,
    lastReconciledAt: null,
  },
  selection: {
    selectedIds: [],
    anchorId: null,
  },
  ui: {
    viewMode: "list",
    sortBy: "name",
    sortDir: "asc",
    activeFileId: null,
    activeFolderId: null,
  },
  uploads: {},
  realtime: {
    status: "detached",
    userId: null,
    lastEventAt: null,
    error: null,
  },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const slice = createSlice({
  name: "cloudFiles",
  initialState,
  reducers: {
    // ---- Files: upsert / merge ---------------------------------------------
    upsertFiles(state, action: PayloadAction<Partial<CloudFile>[]>) {
      for (const partial of action.payload) {
        if (!partial.id) continue;
        const existing =
          state.filesById[partial.id] ?? emptyFileRecord(partial.id);
        mergeFileIntoRecord(existing, partial);
        state.filesById[partial.id] = existing;
      }
    },

    upsertFile(state, action: PayloadAction<Partial<CloudFile>>) {
      const partial = action.payload;
      if (!partial.id) return;
      const existing =
        state.filesById[partial.id] ?? emptyFileRecord(partial.id);
      mergeFileIntoRecord(existing, partial);
      state.filesById[partial.id] = existing;
    },

    // ---- Files: field edits (optimistic) -----------------------------------
    setFileField(
      state,
      action: PayloadAction<{
        id: string;
        field: keyof CloudFile;
        value: CloudFile[keyof CloudFile];
      }>,
    ) {
      const { id, field, value } = action.payload;
      const record = state.filesById[id];
      if (!record) return;
      applyFileFieldEdit(record, field, value);
    },

    resetFileField(
      state,
      action: PayloadAction<{ id: string; field: keyof CloudFile }>,
    ) {
      const { id, field } = action.payload;
      const record = state.filesById[id];
      if (!record) return;
      const snap = record._fieldHistory as Record<string, unknown>;
      if (field in snap) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (record as any)[field] = snap[field as string];
        delete snap[field as string];
        removeField(record._dirtyFields, field);
      }
      if (Object.keys(record._dirtyFields).length === 0) {
        record._dirty = false;
      }
    },

    markFileSaved(state, action: PayloadAction<{ id: string }>) {
      const record = state.filesById[action.payload.id];
      if (!record) return;
      markFileClean(record);
    },

    rollbackFileOptimisticUpdate(
      state,
      action: PayloadAction<{
        id: string;
        snapshot: CloudFileFieldSnapshot;
      }>,
    ) {
      const { id, snapshot } = action.payload;
      const record = state.filesById[id];
      if (!record) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.assign(record as any, snapshot);
      record._dirty = false;
      record._dirtyFields = createFieldFlags<keyof CloudFile>();
      record._fieldHistory = {};
    },

    // ---- Files: remove / pending requests ----------------------------------
    removeFile(state, action: PayloadAction<{ id: string }>) {
      const { id } = action.payload;
      delete state.filesById[id];
      delete state.versionsByFileId[id];
      // Unlink from tree if present.
      for (const parentId of Object.keys(state.tree.childrenByFolderId)) {
        const bucket = state.tree.childrenByFolderId[parentId];
        const idx = bucket.fileIds.indexOf(id);
        if (idx >= 0) bucket.fileIds.splice(idx, 1);
      }
      const rootIdx = state.tree.rootFileIds.indexOf(id);
      if (rootIdx >= 0) state.tree.rootFileIds.splice(rootIdx, 1);
    },

    addFilePendingRequest(
      state,
      action: PayloadAction<{ id: string; requestId: string }>,
    ) {
      const { id, requestId } = action.payload;
      const record = state.filesById[id];
      if (!record) return;
      if (!record._pendingRequestIds.includes(requestId)) {
        record._pendingRequestIds.push(requestId);
      }
    },

    removeFilePendingRequest(
      state,
      action: PayloadAction<{ id: string; requestId: string }>,
    ) {
      const { id, requestId } = action.payload;
      const record = state.filesById[id];
      if (!record) return;
      const idx = record._pendingRequestIds.indexOf(requestId);
      if (idx >= 0) record._pendingRequestIds.splice(idx, 1);
    },

    setFileLoading(
      state,
      action: PayloadAction<{ id: string; loading: boolean }>,
    ) {
      const record = state.filesById[action.payload.id];
      if (!record) return;
      record._loading = action.payload.loading;
    },

    setFileError(
      state,
      action: PayloadAction<{ id: string; error: string | null }>,
    ) {
      const record = state.filesById[action.payload.id];
      if (!record) return;
      record._error = action.payload.error;
    },

    // ---- Folders: mirror of file reducers ----------------------------------
    upsertFolders(state, action: PayloadAction<Partial<CloudFolder>[]>) {
      for (const partial of action.payload) {
        if (!partial.id) continue;
        const existing =
          state.foldersById[partial.id] ?? emptyFolderRecord(partial.id);
        mergeFolderIntoRecord(existing, partial);
        state.foldersById[partial.id] = existing;
      }
    },

    upsertFolder(state, action: PayloadAction<Partial<CloudFolder>>) {
      const partial = action.payload;
      if (!partial.id) return;
      const existing =
        state.foldersById[partial.id] ?? emptyFolderRecord(partial.id);
      mergeFolderIntoRecord(existing, partial);
      state.foldersById[partial.id] = existing;
    },

    setFolderField(
      state,
      action: PayloadAction<{
        id: string;
        field: keyof CloudFolder;
        value: CloudFolder[keyof CloudFolder];
      }>,
    ) {
      const { id, field, value } = action.payload;
      const record = state.foldersById[id];
      if (!record) return;
      applyFolderFieldEdit(record, field, value);
    },

    markFolderSaved(state, action: PayloadAction<{ id: string }>) {
      const record = state.foldersById[action.payload.id];
      if (!record) return;
      markFolderClean(record);
    },

    rollbackFolderOptimisticUpdate(
      state,
      action: PayloadAction<{
        id: string;
        snapshot: CloudFolderFieldSnapshot;
      }>,
    ) {
      const { id, snapshot } = action.payload;
      const record = state.foldersById[id];
      if (!record) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.assign(record as any, snapshot);
      record._dirty = false;
      record._dirtyFields = createFieldFlags<keyof CloudFolder>();
      record._fieldHistory = {};
    },

    removeFolder(state, action: PayloadAction<{ id: string }>) {
      const { id } = action.payload;
      delete state.foldersById[id];
      delete state.tree.childrenByFolderId[id];
      for (const parentId of Object.keys(state.tree.childrenByFolderId)) {
        const bucket = state.tree.childrenByFolderId[parentId];
        const idx = bucket.folderIds.indexOf(id);
        if (idx >= 0) bucket.folderIds.splice(idx, 1);
      }
      const rootIdx = state.tree.rootFolderIds.indexOf(id);
      if (rootIdx >= 0) state.tree.rootFolderIds.splice(rootIdx, 1);
    },

    // ---- Versions ----------------------------------------------------------
    upsertVersionsForFile(
      state,
      action: PayloadAction<{ fileId: string; versions: CloudFileVersion[] }>,
    ) {
      state.versionsByFileId[action.payload.fileId] =
        action.payload.versions;
    },

    // ---- Permissions -------------------------------------------------------
    upsertPermissionsForResource(
      state,
      action: PayloadAction<{
        resourceId: string;
        permissions: CloudFilePermission[];
      }>,
    ) {
      state.permissionsByResourceId[action.payload.resourceId] =
        action.payload.permissions;
    },

    removePermissionForResource(
      state,
      action: PayloadAction<{
        resourceId: string;
        granteeId: string;
        granteeType?: "user" | "group";
      }>,
    ) {
      const { resourceId, granteeId, granteeType } = action.payload;
      const list = state.permissionsByResourceId[resourceId];
      if (!list) return;
      state.permissionsByResourceId[resourceId] = list.filter(
        (p) =>
          !(
            p.granteeId === granteeId &&
            (granteeType ? p.granteeType === granteeType : true)
          ),
      );
    },

    // ---- Share links -------------------------------------------------------
    upsertShareLinksForResource(
      state,
      action: PayloadAction<{
        resourceId: string;
        shareLinks: CloudShareLink[];
      }>,
    ) {
      state.shareLinksByResourceId[action.payload.resourceId] =
        action.payload.shareLinks;
    },

    removeShareLink(
      state,
      action: PayloadAction<{ shareToken: string }>,
    ) {
      const { shareToken } = action.payload;
      for (const resourceId of Object.keys(state.shareLinksByResourceId)) {
        state.shareLinksByResourceId[resourceId] =
          state.shareLinksByResourceId[resourceId].filter(
            (l) => l.shareToken !== shareToken,
          );
      }
    },

    // ---- Groups ------------------------------------------------------------
    upsertGroups(state, action: PayloadAction<CloudUserGroup[]>) {
      for (const group of action.payload) {
        state.groupsById[group.id] = group;
      }
    },

    upsertGroupMembers(
      state,
      action: PayloadAction<{
        groupId: string;
        members: CloudUserGroupMember[];
      }>,
    ) {
      state.groupMembersByGroupId[action.payload.groupId] =
        action.payload.members;
    },

    // ---- Tree --------------------------------------------------------------
    setTreeStatus(
      state,
      action: PayloadAction<{
        status: "idle" | "loading" | "loaded" | "error";
        error?: string | null;
      }>,
    ) {
      state.tree.status = action.payload.status;
      state.tree.error = action.payload.error ?? null;
    },

    replaceTree(
      state,
      action: PayloadAction<{
        rootFolderIds: string[];
        rootFileIds: string[];
        childrenByFolderId: Record<string, TreeChildren>;
        fullyLoadedFolderIds?: Record<string, true>;
      }>,
    ) {
      state.tree.rootFolderIds = action.payload.rootFolderIds;
      state.tree.rootFileIds = action.payload.rootFileIds;
      state.tree.childrenByFolderId = action.payload.childrenByFolderId;
      state.tree.fullyLoadedFolderIds =
        action.payload.fullyLoadedFolderIds ?? {};
      state.tree.status = "loaded";
      state.tree.error = null;
      state.tree.lastReconciledAt = Date.now();
    },

    markFolderFullyLoaded(state, action: PayloadAction<{ folderId: string }>) {
      state.tree.fullyLoadedFolderIds[action.payload.folderId] = true;
    },

    attachChildToFolder(
      state,
      action: PayloadAction<{
        parentFolderId: string | null;
        kind: "file" | "folder";
        id: string;
      }>,
    ) {
      const { parentFolderId, kind, id } = action.payload;
      if (!parentFolderId) {
        if (kind === "file") {
          if (!state.tree.rootFileIds.includes(id)) {
            state.tree.rootFileIds.push(id);
          }
        } else {
          if (!state.tree.rootFolderIds.includes(id)) {
            state.tree.rootFolderIds.push(id);
          }
        }
        return;
      }
      const bucket = (state.tree.childrenByFolderId[parentFolderId] ??= {
        folderIds: [],
        fileIds: [],
      });
      const list = kind === "file" ? bucket.fileIds : bucket.folderIds;
      if (!list.includes(id)) list.push(id);
    },

    detachChildFromFolder(
      state,
      action: PayloadAction<{
        parentFolderId: string | null;
        kind: "file" | "folder";
        id: string;
      }>,
    ) {
      const { parentFolderId, kind, id } = action.payload;
      if (!parentFolderId) {
        const list =
          kind === "file" ? state.tree.rootFileIds : state.tree.rootFolderIds;
        const idx = list.indexOf(id);
        if (idx >= 0) list.splice(idx, 1);
        return;
      }
      const bucket = state.tree.childrenByFolderId[parentFolderId];
      if (!bucket) return;
      const list = kind === "file" ? bucket.fileIds : bucket.folderIds;
      const idx = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1);
    },

    // ---- Selection + UI ---------------------------------------------------
    setSelection(state, action: PayloadAction<SelectionState>) {
      state.selection = action.payload;
    },

    clearSelection(state) {
      state.selection = { selectedIds: [], anchorId: null };
    },

    toggleSelection(state, action: PayloadAction<{ id: string }>) {
      const { id } = action.payload;
      const idx = state.selection.selectedIds.indexOf(id);
      if (idx >= 0) {
        state.selection.selectedIds.splice(idx, 1);
        if (state.selection.anchorId === id) state.selection.anchorId = null;
      } else {
        state.selection.selectedIds.push(id);
        state.selection.anchorId = id;
      }
    },

    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.ui.viewMode = action.payload;
    },

    setSort(
      state,
      action: PayloadAction<{ sortBy: SortBy; sortDir: SortDirection }>,
    ) {
      state.ui.sortBy = action.payload.sortBy;
      state.ui.sortDir = action.payload.sortDir;
    },

    setActiveFileId(state, action: PayloadAction<string | null>) {
      state.ui.activeFileId = action.payload;
    },

    setActiveFolderId(state, action: PayloadAction<string | null>) {
      state.ui.activeFolderId = action.payload;
    },

    // ---- Uploads -----------------------------------------------------------
    trackUploadStart(
      state,
      action: PayloadAction<{
        requestId: string;
        fileName: string;
        fileSize: number;
        parentFolderId: string | null;
      }>,
    ) {
      const { requestId, fileName, fileSize, parentFolderId } =
        action.payload;
      state.uploads[requestId] = {
        requestId,
        fileName,
        fileSize,
        parentFolderId,
        status: "uploading",
        bytesUploaded: 0,
        startedAt: Date.now(),
        completedAt: null,
        error: null,
        retries: 0,
        fileId: null,
      };
    },

    updateUploadProgress(
      state,
      action: PayloadAction<{ requestId: string; bytesUploaded: number }>,
    ) {
      const entry = state.uploads[action.payload.requestId];
      if (!entry) return;
      entry.bytesUploaded = action.payload.bytesUploaded;
    },

    updateUploadStatus(
      state,
      action: PayloadAction<{
        requestId: string;
        status: UploadStatus;
        fileId?: string | null;
        error?: string | null;
      }>,
    ) {
      const entry = state.uploads[action.payload.requestId];
      if (!entry) return;
      entry.status = action.payload.status;
      if (action.payload.fileId !== undefined)
        entry.fileId = action.payload.fileId;
      if (action.payload.error !== undefined)
        entry.error = action.payload.error;
      if (
        action.payload.status === "success" ||
        action.payload.status === "error" ||
        action.payload.status === "cancelled"
      ) {
        entry.completedAt = Date.now();
      }
    },

    clearUpload(state, action: PayloadAction<{ requestId: string }>) {
      delete state.uploads[action.payload.requestId];
    },

    clearCompletedUploads(state) {
      for (const id of Object.keys(state.uploads)) {
        const entry = state.uploads[id];
        if (
          entry.status === "success" ||
          entry.status === "cancelled"
        ) {
          delete state.uploads[id];
        }
      }
    },

    // ---- Realtime lifecycle -----------------------------------------------
    setRealtimeStatus(
      state,
      action: PayloadAction<{
        status: CloudFilesState["realtime"]["status"];
        userId?: string | null;
        error?: string | null;
      }>,
    ) {
      state.realtime.status = action.payload.status;
      if (action.payload.userId !== undefined) {
        state.realtime.userId = action.payload.userId;
      }
      state.realtime.error = action.payload.error ?? null;
      if (action.payload.status === "subscribed") {
        state.realtime.lastEventAt = Date.now();
      }
    },

    touchRealtime(state) {
      state.realtime.lastEventAt = Date.now();
    },

    resetCloudFilesState() {
      return initialState;
    },
  },
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const {
  // files
  upsertFile,
  upsertFiles,
  setFileField,
  resetFileField,
  markFileSaved,
  rollbackFileOptimisticUpdate,
  removeFile,
  addFilePendingRequest,
  removeFilePendingRequest,
  setFileLoading,
  setFileError,
  // folders
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
  touchRealtime,
  resetCloudFilesState,
} = slice.actions;

export const cloudFilesReducer = slice.reducer;
export default slice.reducer;

// Re-export for thunks / middleware that need to build empty records locally.
export { emptyFileRecord, emptyFolderRecord };

// Re-export visibility helper type to the barrel.
export type { Visibility };
