/**
 * features/files/redux/thunks.ts
 *
 * Async orchestration for cloud files: reads via supabase-js (RLS), writes via
 * the REST API client. Every mutation follows the pattern:
 *
 *   1. Snapshot current state for rollback.
 *   2. Dispatch optimistic reducer immediately.
 *   3. Register the requestId in the ledger (for realtime echo dedup).
 *   4. Call the REST API.
 *   5. On success: markSaved, release ledger entry.
 *   6. On error: dispatch rollback, set error, release ledger entry, rethrow.
 */

"use client";

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { supabase } from "@/utils/supabase/client";

import * as Files from "../api/files";
import * as Folders from "../api/folders";
import * as Permissions from "../api/permissions";
import * as ShareLinks from "../api/share-links";
import * as Versions from "../api/versions";
import { newRequestId } from "../api/client";
import {
  apiFileRecordToCloudFile,
  dbRowToCloudFile,
  dbRowToCloudFilePermission,
  dbRowToCloudFileVersion,
  dbRowToCloudFolder,
  dbRowToCloudShareLink,
  parseCloudTreeRows,
} from "./converters";
import { registerRequest, releaseRequest } from "./request-ledger";
import { buildTreeState } from "./tree-utils";
import {
  addFilePendingRequest,
  attachChildToFolder,
  clearUpload,
  detachChildFromFolder,
  markFileSaved,
  removeFile,
  removeFilePendingRequest,
  removeFolder,
  removePermissionForResource,
  removeShareLink,
  replaceTree,
  rollbackFileOptimisticUpdate,
  setFileError,
  setFileField,
  setFileLoading,
  setTreeStatus,
  trackUploadStart,
  updateUploadProgress,
  updateUploadStatus,
  upsertFile,
  upsertFiles,
  upsertFolder,
  upsertFolders,
  upsertPermissionsForResource,
  upsertShareLinksForResource,
  upsertVersionsForFile,
} from "./slice";
import { getFileFromState } from "./selectors";

import type {
  CloudFile,
  CloudFileFieldSnapshot,
  CloudFilePermission,
  CloudFileVersion,
  CloudFolder,
  CloudShareLink,
  CreateShareLinkArg,
  DeactivateShareLinkArg,
  DeleteFileArg,
  GrantPermissionArg,
  MoveFileArg,
  RenameFileArg,
  RestoreVersionArg,
  RevokePermissionArg,
  SignedUrlArg,
  UpdateFileMetadataArg,
  UploadFilesArg,
  Visibility,
} from "../types";

type ThunkApi = { dispatch: AppDispatch; state: RootState };

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Loads the full tree for the current user via the cld_get_user_file_tree
 * RPC. Normalizes into filesById / foldersById / tree.
 */
export const loadUserFileTree = createAsyncThunk<
  void,
  { userId: string },
  ThunkApi
>("cloudFiles/loadUserFileTree", async ({ userId }, { dispatch }) => {
  dispatch(setTreeStatus({ status: "loading" }));

  const { data, error } = await supabase.rpc("cld_get_user_file_tree", {
    p_user_id: userId,
  });

  if (error) {
    dispatch(setTreeStatus({ status: "error", error: error.message }));
    throw error;
  }

  const rows = parseCloudTreeRows(data);

  const files: Partial<CloudFile>[] = [];
  const folders: Partial<CloudFolder>[] = [];
  for (const row of rows) {
    if (row.kind === "file") {
      files.push({
        id: row.id,
        ownerId: row.owner_id,
        filePath: row.file_path,
        fileName: row.file_name,
        parentFolderId: row.parent_folder_id,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        visibility: row.visibility,
        currentVersion: row.current_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      });
    } else {
      folders.push({
        id: row.id,
        ownerId: row.owner_id,
        folderPath: row.folder_path,
        folderName: row.folder_name,
        parentId: row.parent_id,
        visibility: row.visibility,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      });
    }
  }

  dispatch(upsertFiles(files));
  dispatch(upsertFolders(folders));

  // Build tree spine directly from the just-parsed rows. Simpler than reading
  // the normalized slice back out, and avoids any race with batched dispatch.
  const fileIds = files.map((f) => f.id!).filter(Boolean);
  const folderIds = folders.map((f) => f.id!).filter(Boolean);
  const tree = buildTreeState({
    fileIds,
    folderIds,
    filesById: Object.fromEntries(
      files.map((f) => [
        f.id!,
        {
          id: f.id!,
          ownerId: f.ownerId ?? "",
          filePath: f.filePath ?? "",
          storageUri: "",
          fileName: f.fileName ?? "",
          mimeType: f.mimeType ?? null,
          fileSize: f.fileSize ?? null,
          checksum: null,
          visibility: (f.visibility ?? "private") as Visibility,
          currentVersion: f.currentVersion ?? 1,
          parentFolderId: f.parentFolderId ?? null,
          metadata: {},
          createdAt: f.createdAt ?? "",
          updatedAt: f.updatedAt ?? "",
          deletedAt: f.deletedAt ?? null,
          _dirty: false,
          _dirtyFields: {},
          _fieldHistory: {},
          _loadedFields: {},
          _loading: false,
          _error: null,
          _pendingRequestIds: [],
        },
      ]),
    ),
    foldersById: Object.fromEntries(
      folders.map((f) => [
        f.id!,
        {
          id: f.id!,
          ownerId: f.ownerId ?? "",
          folderPath: f.folderPath ?? "",
          folderName: f.folderName ?? "",
          parentId: f.parentId ?? null,
          visibility: (f.visibility ?? "private") as Visibility,
          metadata: {},
          createdAt: f.createdAt ?? "",
          updatedAt: f.updatedAt ?? "",
          deletedAt: f.deletedAt ?? null,
          _dirty: false,
          _dirtyFields: {},
          _fieldHistory: {},
          _loadedFields: {},
          _loading: false,
          _error: null,
          _pendingRequestIds: [],
        },
      ]),
    ),
  });
  dispatch(
    replaceTree({
      rootFolderIds: tree.rootFolderIds,
      rootFileIds: tree.rootFileIds,
      childrenByFolderId: tree.childrenByFolderId,
    }),
  );
});

/**
 * Re-run the tree load. Fired by the realtime middleware when the subscription
 * reconnects after an outage — guarantees we don't miss events.
 */
export const reconcileTree = createAsyncThunk<
  void,
  { userId: string },
  ThunkApi
>("cloudFiles/reconcileTree", async ({ userId }, { dispatch }) => {
  await dispatch(loadUserFileTree({ userId })).unwrap();
});

export const loadFolderContents = createAsyncThunk<
  void,
  { folderId: string },
  ThunkApi
>("cloudFiles/loadFolderContents", async ({ folderId }, { dispatch }) => {
  const [filesRes, foldersRes] = await Promise.all([
    supabase
      .from("cld_files")
      .select("*")
      .eq("parent_folder_id", folderId)
      .is("deleted_at", null),
    supabase
      .from("cld_folders")
      .select("*")
      .eq("parent_id", folderId)
      .is("deleted_at", null),
  ]);
  if (filesRes.error) throw filesRes.error;
  if (foldersRes.error) throw foldersRes.error;

  dispatch(upsertFiles((filesRes.data ?? []).map(dbRowToCloudFile)));
  dispatch(upsertFolders((foldersRes.data ?? []).map(dbRowToCloudFolder)));

  for (const f of filesRes.data ?? []) {
    dispatch(
      attachChildToFolder({
        parentFolderId: folderId,
        kind: "file",
        id: f.id,
      }),
    );
  }
  for (const f of foldersRes.data ?? []) {
    dispatch(
      attachChildToFolder({
        parentFolderId: folderId,
        kind: "folder",
        id: f.id,
      }),
    );
  }
});

export const loadFileVersions = createAsyncThunk<
  void,
  { fileId: string },
  ThunkApi
>("cloudFiles/loadFileVersions", async ({ fileId }, { dispatch }) => {
  const { data, error } = await supabase
    .from("cld_file_versions")
    .select("*")
    .eq("file_id", fileId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  const versions: CloudFileVersion[] = (data ?? []).map(
    dbRowToCloudFileVersion,
  );
  dispatch(upsertVersionsForFile({ fileId, versions }));
});

export const loadPermissions = createAsyncThunk<
  void,
  { resourceId: string },
  ThunkApi
>("cloudFiles/loadPermissions", async ({ resourceId }, { dispatch }) => {
  const { data, error } = await supabase
    .from("cld_file_permissions")
    .select("*")
    .eq("resource_id", resourceId);
  if (error) throw error;
  const permissions: CloudFilePermission[] = (data ?? []).map(
    dbRowToCloudFilePermission,
  );
  dispatch(upsertPermissionsForResource({ resourceId, permissions }));
});

export const loadShareLinks = createAsyncThunk<
  void,
  { resourceId: string },
  ThunkApi
>("cloudFiles/loadShareLinks", async ({ resourceId }, { dispatch }) => {
  const { data, error } = await supabase
    .from("cld_share_links")
    .select("*")
    .eq("resource_id", resourceId)
    .eq("is_active", true);
  if (error) throw error;
  const shareLinks: CloudShareLink[] = (data ?? []).map(dbRowToCloudShareLink);
  dispatch(upsertShareLinksForResource({ resourceId, shareLinks }));
});

// ---------------------------------------------------------------------------
// Writes — folders
// ---------------------------------------------------------------------------
//
// NOTE: The Python backend doesn't expose dedicated folder-CRUD endpoints
// per the current contract (see PYTHON_TEAM_COMMS.md). Folders are cheap,
// rows-only entities with RLS, so we write directly via supabase-js. If the
// Python team ships a REST endpoint later, these thunks can be swapped to
// hit it without changing callers.

export const createFolder = createAsyncThunk<
  string,
  import("../types").CreateFolderArg,
  ThunkApi
>("cloudFiles/createFolder", async (arg, { dispatch, getState }) => {
  const state = getState();
  const parent = arg.parentId
    ? state.cloudFiles.foldersById[arg.parentId]
    : null;

  const folderName = arg.folderName.trim();
  if (!folderName) {
    throw new Error("Folder name cannot be empty.");
  }
  if (/[/\\]/.test(folderName)) {
    throw new Error("Folder names cannot contain '/' or '\\'.");
  }

  const folderPath = parent ? `${parent.folderPath}/${folderName}` : folderName;

  // Pull owner_id from the current session — RLS enforces the match anyway.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to create a folder.");

  const insertRow = {
    folder_name: folderName,
    folder_path: folderPath,
    owner_id: user.id,
    parent_id: arg.parentId,
    visibility: arg.visibility ?? "private",
    metadata: (arg.metadata ?? {}) as Record<string, unknown>,
  };

  const { data, error } = await supabase
    .from("cld_folders")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    // Surface FK + unique-violation errors as-is.
    throw error;
  }

  const folder = dbRowToCloudFolder(data);
  dispatch(upsertFolder(folder));
  dispatch(
    attachChildToFolder({
      parentFolderId: folder.parentId,
      kind: "folder",
      id: folder.id,
    }),
  );
  return folder.id;
});

export const deleteFolder = createAsyncThunk<
  void,
  import("../types").DeleteFolderArg,
  ThunkApi
>("cloudFiles/deleteFolder", async (arg, { dispatch, getState }) => {
  const state = getState();
  const folder = state.cloudFiles.foldersById[arg.folderId];
  if (!folder) return;

  // Optimistic: mark deleted or remove.
  if (arg.hardDelete) {
    const { error } = await supabase
      .from("cld_folders")
      .delete()
      .eq("id", arg.folderId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("cld_folders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", arg.folderId);
    if (error) throw error;
  }

  dispatch(removeFolder({ id: arg.folderId }));
});

/**
 * Ensure every segment of `folderPath` exists; create any that don't.
 * Returns the leaf folder's id. Used for convention-based uploads like
 * "save all pasted images under /Images".
 */
export const ensureFolderPath = createAsyncThunk<
  string,
  import("../types").EnsureFolderPathArg,
  ThunkApi
>("cloudFiles/ensureFolderPath", async (arg, { dispatch, getState }) => {
  const segments = arg.folderPath
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    throw new Error("folderPath cannot be empty.");
  }

  let parentId: string | null = null;
  let accumulatedPath = "";

  for (const segment of segments) {
    accumulatedPath = accumulatedPath
      ? `${accumulatedPath}/${segment}`
      : segment;

    // Check live state first — the realtime subscription keeps it current.
    const state = getState();
    const existing = Object.values(state.cloudFiles.foldersById).find(
      (f) =>
        f.folderPath === accumulatedPath &&
        !f.deletedAt &&
        (parentId == null ? f.parentId == null : f.parentId === parentId),
    );
    if (existing) {
      parentId = existing.id;
      continue;
    }

    // Not in local state — fall back to a DB lookup (another device may have
    // created it). This is the path that also handles races on first use.
    const { data: existingRow } = await supabase
      .from("cld_folders")
      .select("*")
      .eq("folder_path", accumulatedPath)
      .is("deleted_at", null)
      .maybeSingle();
    if (existingRow) {
      const existingFolder = dbRowToCloudFolder(existingRow);
      dispatch(upsertFolder(existingFolder));
      parentId = existingFolder.id;
      continue;
    }

    // Still missing — create it.
    parentId = await dispatch(
      createFolder({
        folderName: segment,
        parentId,
        visibility: arg.visibility ?? "private",
      }),
    ).unwrap();
  }

  if (!parentId) throw new Error("Unreachable: ensureFolderPath");
  return parentId;
});

// ---------------------------------------------------------------------------
// Writes — uploads (multi-file with progress)
// ---------------------------------------------------------------------------

export const uploadFiles = createAsyncThunk<
  { uploaded: string[]; failed: string[] },
  UploadFilesArg,
  ThunkApi
>("cloudFiles/uploadFiles", async (arg, { dispatch, getState }) => {
  const concurrency = Math.max(1, arg.concurrency ?? 3);
  const uploaded: string[] = [];
  const failed: string[] = [];

  // Resolve logical path prefix from parent folder (if any).
  const state = getState();
  const parentFolder = arg.parentFolderId
    ? state.cloudFiles.foldersById[arg.parentFolderId]
    : null;
  const prefix = parentFolder ? `${parentFolder.folderPath}/` : "";

  const queue = [...arg.files];
  async function worker(): Promise<void> {
    while (queue.length) {
      const file = queue.shift();
      if (!file) return;
      const requestId = newRequestId();
      dispatch(
        trackUploadStart({
          requestId,
          fileName: file.name,
          fileSize: file.size,
          parentFolderId: arg.parentFolderId,
        }),
      );
      registerRequest({
        requestId,
        kind: "upload",
        resourceId: null,
        resourceType: "file",
      });
      try {
        const { data } = await Files.uploadFileWithProgress(
          {
            file,
            filePath: `${prefix}${file.name}`,
            visibility: arg.visibility ?? "private",
            shareWith: arg.shareWith,
            shareLevel: arg.shareLevel,
            changeSummary: arg.changeSummary,
            metadata: arg.metadata,
          },
          (ev) =>
            dispatch(
              updateUploadProgress({
                requestId,
                bytesUploaded: ev.loaded,
              }),
            ),
          { requestId },
        );
        // Upsert file into slice from response.
        dispatch(
          upsertFile(
            apiFileRecordToCloudFile({
              id: data.file_id,
              owner_id: "",
              file_path: data.file_path,
              storage_uri: data.storage_uri,
              file_name: data.file_path.split("/").pop() ?? file.name,
              mime_type: file.type || null,
              file_size: data.file_size,
              checksum: data.checksum,
              visibility: arg.visibility ?? "private",
              current_version: data.version_number,
              parent_folder_id: arg.parentFolderId ?? null,
              metadata: arg.metadata ?? {},
              created_at: null,
              updated_at: null,
              deleted_at: null,
            }),
          ),
        );
        dispatch(
          attachChildToFolder({
            parentFolderId: arg.parentFolderId,
            kind: "file",
            id: data.file_id,
          }),
        );
        dispatch(
          updateUploadStatus({
            requestId,
            status: "success",
            fileId: data.file_id,
          }),
        );
        uploaded.push(data.file_id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        dispatch(
          updateUploadStatus({
            requestId,
            status: "error",
            error: message,
          }),
        );
        failed.push(file.name);
      } finally {
        releaseRequest(requestId);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, arg.files.length) }, () =>
      worker(),
    ),
  );

  return { uploaded, failed };
});

export const clearUploadEntry = createAsyncThunk<
  void,
  { requestId: string },
  ThunkApi
>("cloudFiles/clearUpload", async ({ requestId }, { dispatch }) => {
  dispatch(clearUpload({ requestId }));
});

// ---------------------------------------------------------------------------
// Writes — optimistic metadata updates
// ---------------------------------------------------------------------------

export const renameFile = createAsyncThunk<void, RenameFileArg, ThunkApi>(
  "cloudFiles/rename",
  async ({ fileId, newName }, { dispatch, getState }) => {
    const record = getFileFromState(getState(), fileId);
    if (!record) throw new Error(`File not found: ${fileId}`);

    const requestId = newRequestId();
    const snapshot: CloudFileFieldSnapshot = {
      fileName: record.fileName,
      filePath: record.filePath,
    };

    // Compute new file path (replace final segment).
    const pathParts = record.filePath.split("/");
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join("/");

    dispatch(setFileField({ id: fileId, field: "fileName", value: newName }));
    dispatch(setFileField({ id: fileId, field: "filePath", value: newPath }));
    dispatch(addFilePendingRequest({ id: fileId, requestId }));
    registerRequest({
      requestId,
      kind: "rename",
      resourceId: fileId,
      resourceType: "file",
    });

    try {
      // Rename is expressed as a metadata patch in the backend (file_path is
      // derived server-side from file_name + parent). We use the metadata field
      // as the vehicle since there's no dedicated rename endpoint today.
      await Files.patchFile(
        fileId,
        {
          metadata: {
            ...record.metadata,
            __rename_request__: { new_name: newName, request_id: requestId },
          },
        },
        { requestId },
      );
      dispatch(markFileSaved({ id: fileId }));
    } catch (err) {
      dispatch(rollbackFileOptimisticUpdate({ id: fileId, snapshot }));
      const msg = err instanceof Error ? err.message : String(err);
      dispatch(setFileError({ id: fileId, error: msg }));
      throw err;
    } finally {
      dispatch(removeFilePendingRequest({ id: fileId, requestId }));
      releaseRequest(requestId);
    }
  },
);

export const moveFile = createAsyncThunk<void, MoveFileArg, ThunkApi>(
  "cloudFiles/move",
  async ({ fileId, newParentFolderId }, { dispatch, getState }) => {
    const record = getFileFromState(getState(), fileId);
    if (!record) throw new Error(`File not found: ${fileId}`);
    const oldParentId = record.parentFolderId;
    const requestId = newRequestId();
    const snapshot: CloudFileFieldSnapshot = {
      parentFolderId: oldParentId,
    };

    dispatch(
      setFileField({
        id: fileId,
        field: "parentFolderId",
        value: newParentFolderId,
      }),
    );
    dispatch(
      detachChildFromFolder({
        parentFolderId: oldParentId,
        kind: "file",
        id: fileId,
      }),
    );
    dispatch(
      attachChildToFolder({
        parentFolderId: newParentFolderId,
        kind: "file",
        id: fileId,
      }),
    );
    dispatch(addFilePendingRequest({ id: fileId, requestId }));
    registerRequest({
      requestId,
      kind: "move",
      resourceId: fileId,
      resourceType: "file",
    });

    try {
      await Files.patchFile(
        fileId,
        {
          metadata: {
            ...record.metadata,
            __move_request__: {
              new_parent_folder_id: newParentFolderId,
              request_id: requestId,
            },
          },
        },
        { requestId },
      );
      dispatch(markFileSaved({ id: fileId }));
    } catch (err) {
      // Rollback tree membership + field.
      dispatch(
        detachChildFromFolder({
          parentFolderId: newParentFolderId,
          kind: "file",
          id: fileId,
        }),
      );
      dispatch(
        attachChildToFolder({
          parentFolderId: oldParentId,
          kind: "file",
          id: fileId,
        }),
      );
      dispatch(rollbackFileOptimisticUpdate({ id: fileId, snapshot }));
      const msg = err instanceof Error ? err.message : String(err);
      dispatch(setFileError({ id: fileId, error: msg }));
      throw err;
    } finally {
      dispatch(removeFilePendingRequest({ id: fileId, requestId }));
      releaseRequest(requestId);
    }
  },
);

export const updateFileMetadata = createAsyncThunk<
  void,
  UpdateFileMetadataArg,
  ThunkApi
>(
  "cloudFiles/updateMetadata",
  async ({ fileId, patch }, { dispatch, getState }) => {
    const record = getFileFromState(getState(), fileId);
    if (!record) throw new Error(`File not found: ${fileId}`);

    const requestId = newRequestId();
    const snapshot: CloudFileFieldSnapshot = {
      visibility: record.visibility,
      metadata: record.metadata,
    };

    if (patch.visibility !== undefined) {
      dispatch(
        setFileField({
          id: fileId,
          field: "visibility",
          value: patch.visibility,
        }),
      );
    }
    if (patch.metadata !== undefined) {
      dispatch(
        setFileField({
          id: fileId,
          field: "metadata",
          value: patch.metadata,
        }),
      );
    }
    dispatch(addFilePendingRequest({ id: fileId, requestId }));
    registerRequest({
      requestId,
      kind: "update",
      resourceId: fileId,
      resourceType: "file",
    });

    try {
      const { data } = await Files.patchFile(
        fileId,
        {
          visibility: patch.visibility,
          metadata: patch.metadata,
        },
        { requestId },
      );
      dispatch(upsertFile(apiFileRecordToCloudFile(data)));
      dispatch(markFileSaved({ id: fileId }));
    } catch (err) {
      dispatch(rollbackFileOptimisticUpdate({ id: fileId, snapshot }));
      const msg = err instanceof Error ? err.message : String(err);
      dispatch(setFileError({ id: fileId, error: msg }));
      throw err;
    } finally {
      dispatch(removeFilePendingRequest({ id: fileId, requestId }));
      releaseRequest(requestId);
    }
  },
);

// ---------------------------------------------------------------------------
// Writes — delete
// ---------------------------------------------------------------------------

export const deleteFile = createAsyncThunk<void, DeleteFileArg, ThunkApi>(
  "cloudFiles/delete",
  async ({ fileId, hardDelete }, { dispatch, getState }) => {
    const record = getFileFromState(getState(), fileId);
    if (!record) return; // nothing to do
    const parentFolderId = record.parentFolderId;
    const requestId = newRequestId();

    // Optimistic remove.
    dispatch(removeFile({ id: fileId }));
    dispatch(
      detachChildFromFolder({
        parentFolderId,
        kind: "file",
        id: fileId,
      }),
    );
    registerRequest({
      requestId,
      kind: "delete",
      resourceId: fileId,
      resourceType: "file",
    });

    try {
      await Files.deleteFile(fileId, { hardDelete }, { requestId });
    } catch (err) {
      // Rollback — reinsert the record and reattach to its parent.
      dispatch(upsertFile(record));
      dispatch(
        attachChildToFolder({
          parentFolderId,
          kind: "file",
          id: fileId,
        }),
      );
      throw err;
    } finally {
      releaseRequest(requestId);
    }
  },
);

// ---------------------------------------------------------------------------
// Writes — versions
// ---------------------------------------------------------------------------

export const restoreVersion = createAsyncThunk<
  void,
  RestoreVersionArg,
  ThunkApi
>(
  "cloudFiles/restoreVersion",
  async ({ fileId, versionNumber }, { dispatch }) => {
    dispatch(setFileLoading({ id: fileId, loading: true }));
    const requestId = newRequestId();
    registerRequest({
      requestId,
      kind: "restore-version",
      resourceId: fileId,
      resourceType: "file",
    });
    try {
      const { data } = await Versions.restoreVersion(fileId, versionNumber, {
        requestId,
      });
      dispatch(upsertFile(apiFileRecordToCloudFile(data)));
      // Reload version list to pick up the new synthetic version row.
      await dispatch(loadFileVersions({ fileId })).unwrap();
    } finally {
      dispatch(setFileLoading({ id: fileId, loading: false }));
      releaseRequest(requestId);
    }
  },
);

// ---------------------------------------------------------------------------
// Writes — permissions
// ---------------------------------------------------------------------------

export const grantPermission = createAsyncThunk<
  void,
  GrantPermissionArg,
  ThunkApi
>("cloudFiles/grantPermission", async (arg, { dispatch }) => {
  const requestId = newRequestId();
  registerRequest({
    requestId,
    kind: "grant-permission",
    resourceId: arg.resourceId,
    resourceType: arg.resourceType,
  });
  try {
    const body = {
      grantee_id: arg.granteeId,
      level: arg.level,
      grantee_type: arg.granteeType ?? "user",
      expires_at: arg.expiresAt ?? null,
    };
    const { data } =
      arg.resourceType === "folder"
        ? await Permissions.grantFolderPermission(arg.resourceId, body, {
            requestId,
          })
        : await Permissions.grantFilePermission(arg.resourceId, body, {
            requestId,
          });
    dispatch(
      upsertPermissionsForResource({
        resourceId: arg.resourceId,
        permissions: [dbRowToCloudFilePermission(data)],
      }),
    );
    // Full refresh to keep the list authoritative.
    await dispatch(loadPermissions({ resourceId: arg.resourceId })).unwrap();
  } finally {
    releaseRequest(requestId);
  }
});

export const revokePermission = createAsyncThunk<
  void,
  RevokePermissionArg,
  ThunkApi
>("cloudFiles/revokePermission", async (arg, { dispatch }) => {
  const requestId = newRequestId();
  registerRequest({
    requestId,
    kind: "revoke-permission",
    resourceId: arg.resourceId,
    resourceType: arg.resourceType,
  });
  try {
    if (arg.resourceType === "folder") {
      await Permissions.revokeFolderPermission(
        arg.resourceId,
        arg.granteeId,
        { granteeType: arg.granteeType ?? "user" },
        { requestId },
      );
    } else {
      await Permissions.revokeFilePermission(
        arg.resourceId,
        arg.granteeId,
        { granteeType: arg.granteeType ?? "user" },
        { requestId },
      );
    }
    dispatch(
      removePermissionForResource({
        resourceId: arg.resourceId,
        granteeId: arg.granteeId,
        granteeType: arg.granteeType ?? "user",
      }),
    );
  } finally {
    releaseRequest(requestId);
  }
});

// ---------------------------------------------------------------------------
// Writes — share links
// ---------------------------------------------------------------------------

export const createShareLink = createAsyncThunk<
  CloudShareLink,
  CreateShareLinkArg,
  ThunkApi
>("cloudFiles/createShareLink", async (arg, { dispatch }) => {
  const requestId = newRequestId();
  registerRequest({
    requestId,
    kind: "create-share-link",
    resourceId: arg.resourceId,
    resourceType: arg.resourceType,
  });
  try {
    const body = {
      permission_level: arg.permissionLevel,
      expires_at: arg.expiresAt ?? null,
      max_uses: arg.maxUses ?? null,
    };
    const { data } =
      arg.resourceType === "folder"
        ? await ShareLinks.createFolderShareLink(arg.resourceId, body, {
            requestId,
          })
        : await ShareLinks.createFileShareLink(arg.resourceId, body, {
            requestId,
          });
    const link = dbRowToCloudShareLink(data);
    await dispatch(loadShareLinks({ resourceId: arg.resourceId })).unwrap();
    return link;
  } finally {
    releaseRequest(requestId);
  }
});

export const deactivateShareLink = createAsyncThunk<
  void,
  DeactivateShareLinkArg,
  ThunkApi
>("cloudFiles/deactivateShareLink", async ({ shareToken }, { dispatch }) => {
  const requestId = newRequestId();
  registerRequest({
    requestId,
    kind: "deactivate-share-link",
    resourceId: null,
    resourceType: null,
  });
  try {
    await ShareLinks.deactivateShareLink(shareToken, { requestId });
    dispatch(removeShareLink({ shareToken }));
  } finally {
    releaseRequest(requestId);
  }
});

// ---------------------------------------------------------------------------
// Utility — getSignedUrl (no slice state change; caller stores the URL).
// ---------------------------------------------------------------------------

export const getSignedUrl = createAsyncThunk<
  { url: string; expiresIn: number },
  SignedUrlArg,
  ThunkApi
>("cloudFiles/getSignedUrl", async ({ fileId, expiresIn }) => {
  const { data } = await Files.getSignedUrl(fileId, { expiresIn });
  return { url: data.url, expiresIn: data.expires_in };
});
