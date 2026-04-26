/**
 * features/files/types.ts
 *
 * Single source of truth for all cloud-files types. Every consumer imports from
 * [features/files/index.ts](./index.ts) (barrel) — never from subfolders.
 *
 * LAYERS
 * ------
 *   1. Domain types    — camelCase, what components and Redux work with.
 *   2. DB row types    — snake_case, derived from Supabase-generated `Database`.
 *   3. API types       — from Python OpenAPI-generated `components["schemas"]`.
 *   4. Runtime records — domain types + dirty/loading/error metadata for Redux.
 *   5. Tree & UI types — normalized structure + UI state shapes.
 *   6. Upload types    — upload orchestrator state.
 *   7. Error types     — re-export of BackendApiError, plus files-specific codes.
 *
 * Do NOT duplicate or re-declare any type from here in feature subfolders.
 */

import type { components } from "@/types/python-generated/api-types";
import type { Database } from "@/types/database.types";
import type { FieldFlags } from "@/features/agents/redux/shared/field-flags";

// ---------------------------------------------------------------------------
// 1. Enums (backend contract — copied verbatim from cld_files_frontend.md §7)
// ---------------------------------------------------------------------------

export type Visibility = "public" | "private" | "shared";
export type PermissionLevel = "read" | "write" | "admin";
export type ResourceType = "file" | "folder";
export type GranteeType = "user" | "group";

// ---------------------------------------------------------------------------
// 2. DB row types — straight from Supabase-generated Database type
// ---------------------------------------------------------------------------
//
// These are the authoritative shapes for reads via supabase-js. Always use
// these (not hand-rolled shapes) to track schema changes automatically.
//
// Note on table naming: The Python team's doc uses `cld_file_share_links`
// and `cld_file_groups`. The actual DB tables are `cld_share_links` and
// `cld_user_groups` / `cld_user_group_members`. See PYTHON_TEAM_COMMS.md.

type CloudTables = Database["public"]["Tables"];

export type CloudFileRow = CloudTables["cld_files"]["Row"];
export type CloudFileInsert = CloudTables["cld_files"]["Insert"];
export type CloudFileUpdate = CloudTables["cld_files"]["Update"];

export type CloudFolderRow = CloudTables["cld_folders"]["Row"];
export type CloudFolderInsert = CloudTables["cld_folders"]["Insert"];
export type CloudFolderUpdate = CloudTables["cld_folders"]["Update"];

export type CloudFileVersionRow = CloudTables["cld_file_versions"]["Row"];
export type CloudFilePermissionRow =
  CloudTables["cld_file_permissions"]["Row"];
export type CloudShareLinkRow = CloudTables["cld_share_links"]["Row"];
export type CloudUserGroupRow = CloudTables["cld_user_groups"]["Row"];
export type CloudUserGroupMemberRow =
  CloudTables["cld_user_group_members"]["Row"];

// ---------------------------------------------------------------------------
// 3. API (REST) types — from Python OpenAPI schemas
// ---------------------------------------------------------------------------

export type FileRecordApi = components["schemas"]["FileRecord"];
export type FileUploadResponse = components["schemas"]["FileUploadResponse"];
export type FilePatchRequest = components["schemas"]["FilePatchRequest"];
export type CreateShareLinkRequest =
  components["schemas"]["CreateShareLinkRequest"];
export type ShareLinkResolveResponse =
  components["schemas"]["ShareLinkResolveResponse"];
export type GrantPermissionRequest =
  components["schemas"]["GrantPermissionRequest"];
export type CreateGroupRequest = components["schemas"]["CreateGroupRequest"];
export type AddGroupMemberRequest =
  components["schemas"]["AddGroupMemberRequest"];
export type SignedUrlResponse = components["schemas"]["SignedUrlResponse"];

// ---------------------------------------------------------------------------
// 4. Domain types (camelCase) — what the app works with
// ---------------------------------------------------------------------------
//
// These are converted from CloudFileRow / CloudFolderRow in
// [features/files/redux/converters.ts](./redux/converters.ts).

export interface CloudFile {
  id: string;
  ownerId: string;
  filePath: string;
  storageUri: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  checksum: string | null;
  visibility: Visibility;
  currentVersion: number;
  parentFolderId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CloudFolder {
  id: string;
  ownerId: string;
  folderPath: string;
  folderName: string;
  parentId: string | null;
  visibility: Visibility;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CloudFileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  storageUri: string;
  fileSize: number | null;
  checksum: string | null;
  createdBy: string | null;
  createdAt: string;
  changeSummary: string | null;
}

export interface CloudFilePermission {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  granteeId: string;
  granteeType: GranteeType;
  permissionLevel: PermissionLevel;
  grantedBy: string | null;
  grantedAt: string;
  expiresAt: string | null;
}

export interface CloudShareLink {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  shareToken: string;
  permissionLevel: "read" | "write";
  createdBy: string | null;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  isActive: boolean;
}

export interface CloudUserGroup {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
}

export interface CloudUserGroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  addedBy: string | null;
  addedAt: string;
}

// ---------------------------------------------------------------------------
// 5. Tree RPC types — cld_get_user_file_tree
// ---------------------------------------------------------------------------
//
// The Supabase-generated type is `Json` — we hand-type the expected shape
// tolerantly (converters accept unknown and narrow). If the Python team
// updates the shape, only [redux/converters.ts](./redux/converters.ts) needs
// to change.
//
// Open question logged in PYTHON_TEAM_COMMS.md on exact schema.

export interface CloudTreeFileRow {
  kind: "file";
  id: string;
  file_path: string;
  file_name: string;
  parent_folder_id: string | null;
  mime_type: string | null;
  file_size: number | null;
  visibility: Visibility;
  current_version: number;
  effective_permission: PermissionLevel | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CloudTreeFolderRow {
  kind: "folder";
  id: string;
  folder_path: string;
  folder_name: string;
  parent_id: string | null;
  visibility: Visibility;
  effective_permission: PermissionLevel | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CloudTreeRow = CloudTreeFileRow | CloudTreeFolderRow;

// ---------------------------------------------------------------------------
// 6. Runtime records — what lives in Redux state
// ---------------------------------------------------------------------------
//
// Pattern copied from features/agents/redux/agent-shortcuts (see
// slice.ts::makeEmptyRecord). Every user-editable field gets tracked in
// _dirtyFields + _fieldHistory so optimistic updates can roll back on error.
// _pendingRequestIds holds requestIds in flight; the realtime middleware
// checks this set to dedup its own echoes.

export interface RuntimeMetadata<K extends string> {
  _dirty: boolean;
  _dirtyFields: FieldFlags<K>;
  _loadedFields: FieldFlags<K>;
  _loading: boolean;
  _error: string | null;
  _pendingRequestIds: string[];
}

export type CloudFileFieldSnapshot = Partial<
  Pick<
    CloudFile,
    | "fileName"
    | "filePath"
    | "visibility"
    | "parentFolderId"
    | "metadata"
    | "deletedAt"
  >
>;

export interface CloudFileRecord
  extends CloudFile,
    RuntimeMetadata<keyof CloudFile> {
  _fieldHistory: CloudFileFieldSnapshot;
}

export type CloudFolderFieldSnapshot = Partial<
  Pick<
    CloudFolder,
    "folderName" | "folderPath" | "parentId" | "visibility" | "metadata"
  >
>;

export interface CloudFolderRecord
  extends CloudFolder,
    RuntimeMetadata<keyof CloudFolder> {
  _fieldHistory: CloudFolderFieldSnapshot;
}

// ---------------------------------------------------------------------------
// 7. Tree & UI state
// ---------------------------------------------------------------------------

export interface TreeChildren {
  folderIds: string[];
  fileIds: string[];
}

export interface TreeState {
  rootFolderIds: string[];
  rootFileIds: string[];
  childrenByFolderId: Record<string, TreeChildren>;
  fullyLoadedFolderIds: Record<string, true>;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  lastReconciledAt: number | null;
}

export type ViewMode = "list" | "grid" | "columns";
export type SortBy = "name" | "updated_at" | "size" | "type";
export type SortDirection = "asc" | "desc";

export interface UiState {
  viewMode: ViewMode;
  sortBy: SortBy;
  sortDir: SortDirection;
  activeFileId: string | null;
  activeFolderId: string | null;
}

export interface SelectionState {
  selectedIds: string[];
  anchorId: string | null;
}

// ---------------------------------------------------------------------------
// 8. Upload orchestrator state
// ---------------------------------------------------------------------------

export type UploadStatus =
  | "pending"
  | "uploading"
  | "success"
  | "error"
  | "cancelled";

export interface UploadState {
  requestId: string;
  fileName: string;
  fileSize: number;
  parentFolderId: string | null;
  status: UploadStatus;
  bytesUploaded: number;
  startedAt: number;
  completedAt: number | null;
  error: string | null;
  retries: number;
  /** Populated on success; null until then. */
  fileId: string | null;
}

// ---------------------------------------------------------------------------
// 9. Slice state shape
// ---------------------------------------------------------------------------
//
// Registered under key `cloudFiles` in lib/redux/rootReducer.ts (Phase 2).

export interface CloudFilesState {
  filesById: Record<string, CloudFileRecord>;
  foldersById: Record<string, CloudFolderRecord>;
  versionsByFileId: Record<string, CloudFileVersion[]>;
  permissionsByResourceId: Record<string, CloudFilePermission[]>;
  shareLinksByResourceId: Record<string, CloudShareLink[]>;
  groupsById: Record<string, CloudUserGroup>;
  groupMembersByGroupId: Record<string, CloudUserGroupMember[]>;

  tree: TreeState;
  selection: SelectionState;
  ui: UiState;
  uploads: Record<string, UploadState>;

  /**
   * Realtime attachment status. Mirrors the supabase Channel lifecycle.
   */
  realtime: {
    status: "detached" | "connecting" | "subscribed" | "errored" | "closed";
    userId: string | null;
    lastEventAt: number | null;
    error: string | null;
  };
}

// ---------------------------------------------------------------------------
// 10. Thunk argument shapes (Phase 2 will dispatch these)
// ---------------------------------------------------------------------------

export interface CreateFolderArg {
  folderName: string;
  parentId: string | null;
  visibility?: Visibility;
  metadata?: Record<string, unknown>;
}

export interface DeleteFolderArg {
  folderId: string;
  hardDelete?: boolean;
}

export interface EnsureFolderPathArg {
  /**
   * A folder path like "Images/2026/Q1". Each segment is created if missing.
   * Returns the leaf folder's id.
   */
  folderPath: string;
  visibility?: Visibility;
}

export interface UploadFilesArg {
  files: File[];
  /**
   * Existing folder id (rare — only when you've already created/loaded the
   * folder via realtime or the tree RPC). Prefer `folderPath` for new
   * uploads — the backend auto-creates folders so the browser doesn't
   * need to query `cld_folders` (which can recurse on RLS until the
   * SECURITY DEFINER policy fix lands; see HANDOFF.md).
   */
  parentFolderId?: string | null;
  /**
   * Logical folder path (e.g. "Images/Chat" or "Debug Uploads"). The
   * Python backend creates any missing folders during upload. This is
   * the recommended option for new uploads — it doesn't trigger any
   * supabase-js queries on `cld_folders` from the browser.
   */
  folderPath?: string | null;
  visibility?: Visibility;
  shareWith?: string[];
  shareLevel?: PermissionLevel;
  changeSummary?: string;
  metadata?: Record<string, unknown>;
  /** Parallel upload ceiling. Defaults to 3. */
  concurrency?: number;
}

export interface SignedUrlArg {
  fileId: string;
  /** Seconds. Min 60, max 604800 (7 days). Default 3600. */
  expiresIn?: number;
}

export interface RenameFileArg {
  fileId: string;
  newName: string;
}

export interface MoveFileArg {
  fileId: string;
  newParentFolderId: string | null;
}

export interface UpdateFileMetadataArg {
  fileId: string;
  patch: {
    visibility?: Visibility;
    metadata?: Record<string, unknown>;
  };
}

export interface DeleteFileArg {
  fileId: string;
  hardDelete?: boolean;
}

export interface RestoreVersionArg {
  fileId: string;
  versionNumber: number;
}

export interface GrantPermissionArg {
  resourceId: string;
  resourceType: ResourceType;
  granteeId: string;
  granteeType?: GranteeType;
  level: PermissionLevel;
  expiresAt?: string;
}

export interface RevokePermissionArg {
  resourceId: string;
  resourceType: ResourceType;
  granteeId: string;
  granteeType?: GranteeType;
}

export interface CreateShareLinkArg {
  resourceId: string;
  resourceType: ResourceType;
  permissionLevel: "read" | "write";
  expiresAt?: string;
  maxUses?: number;
}

export interface DeactivateShareLinkArg {
  shareToken: string;
}

// ---------------------------------------------------------------------------
// 11. Request ledger
// ---------------------------------------------------------------------------
//
// Every REST write registers a requestId in the ledger so the realtime
// middleware can dedup echoes of our own optimistic writes.

export type RequestKind =
  | "upload"
  | "update"
  | "delete"
  | "move"
  | "rename"
  | "restore-version"
  | "grant-permission"
  | "revoke-permission"
  | "create-share-link"
  | "deactivate-share-link";

export interface LedgerEntry {
  requestId: string;
  kind: RequestKind;
  resourceId: string | null;
  resourceType: ResourceType | null;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// 12. Error codes — re-export backend error type, add files-specific codes
// ---------------------------------------------------------------------------

export type { BackendApiError } from "@/lib/api/errors";

/** Files-specific error codes. Aligned with cld_files_frontend.md §11. */
export type CloudFilesErrorCode =
  | "invalid_request"
  | "invalid_metadata"
  | "auth_required"
  | "permission_denied"
  | "not_found"
  | "share_link_invalid"
  | "file_too_large"
  | "internal"
  | "cld_sync_unavailable";

// ---------------------------------------------------------------------------
// 13. Type guards
// ---------------------------------------------------------------------------

export function isCloudTreeFileRow(
  row: CloudTreeRow,
): row is CloudTreeFileRow {
  return row.kind === "file";
}

export function isCloudTreeFolderRow(
  row: CloudTreeRow,
): row is CloudTreeFolderRow {
  return row.kind === "folder";
}
