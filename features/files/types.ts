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
// 1b. MediaRef — canonical reference shape for AI API content blocks
// ---------------------------------------------------------------------------
//
// Mirrors the Python backend's `MediaRef` schema verbatim. Every outbound
// `image` / `audio` / `video` / `document` content block on the AI APIs
// (`/ai/agents/{id}`, `/ai/conversations/{id}`, `/ai/chat`, `/ai/manual`,
// etc.) carries one of these as the file identifier.
//
//   Backend Pydantic:
//     class MediaRef(BaseModel):
//       file_id:   str | None = None   # cld_files UUID — preferred
//       url:       str | None = None   # any URL we issued OR external https://
//       file_uri:  str | None = None   # native cloud URI: s3://, gs://, supabase://
//       mime_type: str | None = None
//       metadata:  dict[str, Any] = Field(default_factory=dict)
//
// Exactly ONE of `file_id` / `url` / `file_uri` SHOULD be set, in that
// preference order. Sending more than one is allowed but the backend
// resolves them in the same priority — `file_id` wins, then `file_uri`,
// then `url`.
//
// Use the builders in [redux/converters.ts](./redux/converters.ts):
//   - `cloudFileToMediaRef(file)`  — for an in-store CloudFile
//   - `fileIdToMediaRef(id, mime?)` — when only the id is known
//   - `urlToMediaRef(url, mime?)`   — for external public URLs
//
// **Don't hand-build MediaRefs at callsites.** The builders make sure we
// never accidentally drift from this contract.
export interface MediaRef {
  /** cld_files UUID — preferred form for any file we own. */
  file_id?: string;
  /** Any URL we issued (signed S3, share link) OR external https://. */
  url?: string;
  /** Native cloud URI: `s3://`, `gs://`, `supabase://...`. */
  file_uri?: string;
  /** Optional client hint; backend overrides with `cld_files.mime_type` for owned files. */
  mime_type?: string;
  /** Free-form per-call metadata. Keep small — this rides on every request. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 2. DB row types — straight from Supabase-generated Database type
// ---------------------------------------------------------------------------
//
// These are the authoritative shapes for reads via supabase-js. Always use
// these (not hand-rolled shapes) to track schema changes automatically.
//
// Note on table naming: The Python team's doc uses `cld_file_share_links`
// and `cld_file_groups`. The actual DB tables are `cld_share_links` and
// `cld_user_groups` / `cld_user_group_members`. See for_python/REQUESTS.md.

type CloudTables = Database["public"]["Tables"];

export type CloudFileRow = CloudTables["cld_files"]["Row"];
export type CloudFileInsert = CloudTables["cld_files"]["Insert"];
export type CloudFileUpdate = CloudTables["cld_files"]["Update"];

export type CloudFolderRow = CloudTables["cld_folders"]["Row"];
export type CloudFolderInsert = CloudTables["cld_folders"]["Insert"];
export type CloudFolderUpdate = CloudTables["cld_folders"]["Update"];

export type CloudFileVersionRow = CloudTables["cld_file_versions"]["Row"];
export type CloudFilePermissionRow = CloudTables["cld_file_permissions"]["Row"];
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

/**
 * Discriminator on every cloud-file record. Real records are bytes in S3;
 * virtual records are Postgres rows surfaced by a `VirtualSourceAdapter`
 * (Notes, Agent Apps, Tool UIs, code-files snippets, etc.) — see
 * [features/files/virtual-sources/types.ts](./virtual-sources/types.ts).
 *
 * The `source` field defaults to `{ kind: "real" }` everywhere so existing
 * callers compile unchanged. Synthetic ids of shape
 * `vfs:<adapterId>:<virtualId>[:<fieldId>]` keep the cloud-files Redux
 * `filesById` / `foldersById` maps a single keyspace.
 */
export type FileSource =
  | { kind: "real" }
  | {
      kind: "virtual";
      adapterId: string;
      virtualId: string;
      fieldId?: string;
    };

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
  /**
   * Permanent CDN URL (Cloudflare-fronted) when the file is public AND
   * the server has the CDN feature enabled. ``null`` otherwise — callers
   * should fall back to ``useSignedUrl(fileId)`` for a 1h AWS-signed URL.
   *
   * Carries a ``?v=<checksum[:8]>`` cache-buster so a content change
   * invalidates the cache instantly. **Do not strip the query string.**
   *
   * Populated by the API converter (``apiFileRecordToCloudFile``);
   * always ``null`` for rows that came in via the direct DB read path
   * because the DB has no ``public_url`` column — it's computed
   * server-side from visibility + storage_uri + checksum. For DB-sourced
   * rows, fall back to ``useSignedUrl(fileId)`` to fetch the canonical
   * URL (which the server returns as a CDN URL when applicable).
   */
  publicUrl: string | null;
  /** Real S3-backed bytes vs. virtual Postgres-backed adapter row. */
  source: FileSource;
  /**
   * Binary lineage — points to the cld_files row this one was derived
   * from (e.g. "extracted text from this PDF" or "page range 5–10 of
   * the parent PDF"). Set by Phase 4A migration `0006_cld_files_lineage`.
   * Null when the file was uploaded directly with no derivation.
   * Optional on the FE because it is null for nearly every existing
   * file and was added to the API after the initial schema landed.
   */
  parentFileId?: string | null;
  /**
   * Free-form classifier set by the deriving system: "pdf_text_extract",
   * "page_range_5_10", "ocr_re_run", "merge", … Used by lineage chips
   * to label *how* the parent relates to this file.
   */
  derivationKind?: string | null;
  derivationMetadata?: Record<string, unknown> | null;
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
  /** Real cloud-folder vs. virtual adapter root / nested adapter folder. */
  source: FileSource;
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
// Open question logged in for_python/REQUESTS.md on exact schema.

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
  extends CloudFile, RuntimeMetadata<keyof CloudFile> {
  _fieldHistory: CloudFileFieldSnapshot;
}

export type CloudFolderFieldSnapshot = Partial<
  Pick<
    CloudFolder,
    "folderName" | "folderPath" | "parentId" | "visibility" | "metadata"
  >
>;

export interface CloudFolderRecord
  extends CloudFolder, RuntimeMetadata<keyof CloudFolder> {
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
/** Whether the file table shows files only, folders only, or both. */
export type KindFilter = "all" | "files" | "folders";
/** Optional details surface (extension, mime, dimensions, etc.) on rows. */
export type DetailsLevel = "compact" | "extended";

/** Modified-date preset filter — "today", "week" = last 7d, "month" = last 30d. */
export type ModifiedFilter = "any" | "today" | "week" | "month";
/** Size preset filter — buckets familiar to users. */
export type SizeFilter = "any" | "small" | "medium" | "large" | "huge";
/** Access (visibility) filter. */
export type AccessFilter = "any" | "private" | "shared" | "public";

/** Per-column filters surfaced through the column-header dropdowns. */
export interface ColumnFilters {
  /** Name "contains" — column-scoped text filter, distinct from the
   *  global search box. */
  name: string;
  modified: ModifiedFilter;
  size: SizeFilter;
  access: AccessFilter;
}

export interface UiState {
  viewMode: ViewMode;
  sortBy: SortBy;
  sortDir: SortDirection;
  /** Files-only / folders-only / both. Default = "all". */
  kindFilter: KindFilter;
  /** Whether to show extra detail columns (Extension, Type, Owner, …). */
  detailsLevel: DetailsLevel;
  /** Per-column filter values driven by the column-header dropdowns. */
  columnFilters: ColumnFilters;
  activeFileId: string | null;
  activeFolderId: string | null;
  /**
   * The single item (file or folder id) that has "keyboard/visual focus" — the
   * highlighted row in the Google Drive sense. Set after create/upload so the
   * newly-created item is immediately highlighted and scrolled into view.
   * Clicking any row also moves focus to that row.
   */
  focusedId: string | null;
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
// 10b. Folder CRUD requests (Python P-6 contract)
// ---------------------------------------------------------------------------

/**
 * Request body for `POST /folders` — create a folder. The Python team
 * accepts a logical path (e.g. "Images/Chat") OR an explicit name + parentId.
 * Path-style is preferred because the backend creates intermediate folders
 * atomically and idempotently, matching upload's auto-create semantics.
 */
export interface CreateFolderRequest {
  /** Path style: "Images/Chat/2026". Backend creates any missing segments. */
  folder_path?: string;
  /** Explicit name (used when `parent_id` is set). */
  folder_name?: string;
  /** Required when using `folder_name`; null = root. */
  parent_id?: string | null;
  visibility?: Visibility;
  metadata?: Record<string, unknown> | null;
}

/** Body for `PATCH /folders/{id}`. */
export interface FolderPatchRequest {
  folder_name?: string;
  /** Move: new parent folder id, or null to move to root. */
  parent_id?: string | null;
  visibility?: Visibility;
  metadata?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// 10c. Bulk operations (Python P-7 contract)
// ---------------------------------------------------------------------------

/** Body for `DELETE /files/bulk`. */
export interface BulkDeleteFilesRequest {
  file_ids: string[];
  hard_delete?: boolean;
}

/** Body for `POST /files/bulk/move`. */
export interface BulkMoveFilesRequest {
  file_ids: string[];
  /** Target parent folder id, or null to move to root. */
  new_parent_folder_id: string | null;
}

/** Body for `POST /folders/bulk/move`. */
export interface BulkMoveFoldersRequest {
  folder_ids: string[];
  /** Target parent folder id, or null to move to root. */
  new_parent_id: string | null;
}

/**
 * Per-item outcome inside a bulk response. Matches the backend
 * `BulkResultItem` shape: `{ id, ok, error }` per item plus the
 * aggregate counters returned alongside.
 */
export interface BulkResultItem {
  id: string;
  ok: boolean;
  /** Error code/message string when `ok` is false; null on success. */
  error: string | null;
}

/**
 * Aggregate envelope returned by every bulk endpoint:
 *   - `DELETE /files/bulk`
 *   - `POST /files/bulk/move`
 *   - `POST /folders/bulk/move`
 *
 * The aggregate `succeeded` and `failed` are NUMBERS (counts), not
 * arrays. Per-item detail lives in `results`.
 */
export interface BulkResponse {
  results: BulkResultItem[];
  succeeded: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// 10d. Guest → user migration
// ---------------------------------------------------------------------------

/**
 * Request body for `POST /files/migrate-guest-to-user`.
 *
 * **The fingerprint is sent as the `X-Guest-Fingerprint` HEADER** (the
 * client adds it from `RequestOptions.guestFingerprint`), not in the
 * body. The backend resolves the fingerprint server-side, refuses if
 * the resolved guest UUID does not match `guest_id`, and records the
 * migration in `cld_guest_migrations` — so a second call with a
 * different `new_user_id` returns `409 guest_locked`.
 */
export interface MigrateGuestToUserRequest {
  /** Must equal the authenticated user_id (server verifies). */
  new_user_id: string;
  /**
   * Optional. When provided, the backend cross-checks that the
   * server-resolved fingerprint maps to this guest UUID. Mismatch → 403.
   * When omitted, the server relies entirely on the fingerprint header.
   */
  guest_id?: string;
}

/**
 * Response body for the migration endpoint. Both legacy and current
 * field names are present (the backend returns both for transition).
 */
export interface MigrateGuestToUserResponse {
  // Counts (current shape)
  files: number;
  folders: number;
  groups: number;
  perms: number;
  shares: number;
  // Counts (alias shape kept for FE compatibility)
  files_migrated: number;
  folders_migrated: number;
  groups_migrated: number;
  permissions_migrated: number;
  shares_migrated: number;
}

// ---------------------------------------------------------------------------
// 10e. Storage usage / quotas / tier (GET /files/usage)
// ---------------------------------------------------------------------------

/**
 * Response body of `GET /files/usage`. Drives the storage indicator,
 * the tier badge, and feature gating in the UI. `null` on a numeric
 * field means "no cap" (typically Enterprise tier).
 */
export interface StorageUsageResponse {
  tier_id: string;
  tier_name: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  bytes_used: number;
  files_count: number;
  daily_upload_count: number;
  daily_upload_bytes: number;
  max_storage_bytes: number | null;
  max_file_size_bytes: number | null;
  max_files: number | null;
  max_versions_per_file: number | null;
  max_daily_uploads: number | null;
  max_daily_upload_bytes: number | null;
  max_bulk_items: number | null;
  rate_limit_uploads_per_min: number | null;
  rate_limit_downloads_per_min: number | null;
  features: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 10f. Trash + restore (GET /files/trash, POST /files/{id}/restore)
// ---------------------------------------------------------------------------

/**
 * Response body of `GET /files/trash`. Soft-deleted files + folders for
 * the authenticated user (or guest fingerprint).
 */
export interface TrashListResponse {
  files: FileRecordApi[];
  folders: CloudFolderRow[];
}

// ---------------------------------------------------------------------------
// 10g. Search (GET /files/search)
// ---------------------------------------------------------------------------

/**
 * Response body of `GET /files/search?q=&mime_prefix=&limit=&offset=`.
 * The backend matches against filename + path substring; `mime_prefix`
 * filters by `mime_type LIKE 'prefix%'`.
 */
export interface SearchFilesResponse {
  results: FileRecordApi[];
  query: string;
  total_returned: number;
}

export interface SearchFilesParams {
  q: string;
  mimePrefix?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// 10h. Rename + copy (POST /files/{id}/rename, POST /files/{id}/copy)
// ---------------------------------------------------------------------------

export interface RenameFileRequest {
  /** Full new logical path including filename. Backend auto-creates parents. */
  new_path: string;
}

export interface CopyFileRequest {
  /** Full target logical path including filename. Backend auto-creates parents. */
  target_path: string;
  /** Default false. When false, conflicts return `409 file_already_exists`. */
  overwrite?: boolean;
}

// Convenience thunk-arg variants (camelCase mirrors of the request bodies).
export interface BulkDeleteFilesArg {
  fileIds: string[];
  hardDelete?: boolean;
}

export interface BulkMoveFilesArg {
  fileIds: string[];
  newParentFolderId: string | null;
}

export interface BulkMoveFoldersArg {
  folderIds: string[];
  newParentId: string | null;
}

export interface UpdateFolderArg {
  folderId: string;
  patch: {
    folderName?: string;
    parentId?: string | null;
    visibility?: Visibility;
    metadata?: Record<string, unknown>;
  };
}

export interface MigrateGuestToUserArg {
  /** Authenticated user id files are being claimed FOR. */
  newUserId: string;
  /** Optional cross-check. Backend resolves the fingerprint anyway. */
  guestId?: string;
  /**
   * Server-bound proof of guest identity. Sent as the
   * `X-Guest-Fingerprint` header by the client. Required by the backend.
   */
  guestFingerprint: string;
}

// ---------------------------------------------------------------------------
// 10i. Rename / copy thunk args (camelCase mirrors)
// ---------------------------------------------------------------------------

export interface RenameFileToPathArg {
  fileId: string;
  /** Full new logical path including filename. */
  newPath: string;
}

export interface CopyFileArg {
  fileId: string;
  /** Full target logical path including filename. */
  targetPath: string;
  overwrite?: boolean;
}

// ---------------------------------------------------------------------------
// 10j. Search (camelCase mirrors)
// ---------------------------------------------------------------------------

export interface SearchFilesArg {
  q: string;
  mimePrefix?: string;
  limit?: number;
  offset?: number;
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
  | "deactivate-share-link"
  | "folder-create"
  | "folder-update"
  | "folder-delete"
  | "bulk-delete-files"
  | "file-rename-path"
  | "file-copy"
  | "file-restore"
  | "bulk-move-files"
  | "bulk-move-folders"
  | "migrate-guest";

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

/**
 * Files-specific error codes.
 *
 * Aligned with the Python backend's error envelope. The retry posture
 * column is the FE contract — every caller must respect it:
 *
 * | Code                      | HTTP | Retry?  | UX hint                 |
 * |---------------------------|------|---------|--------------------------|
 * | invalid_request           | 400  | no      | fix the request          |
 * | invalid_path              | 400  | no      | fix the path             |
 * | invalid_metadata          | 400  | no      | fix the patch            |
 * | fingerprint_required      | 400  | no      | guest header missing     |
 * | auth_required             | 401  | no      | sign in                  |
 * | permission_denied         | 403  | no      | request access           |
 * | guest_id_mismatch         | 403  | no      | re-auth                  |
 * | not_found                 | 404  | no      | resource gone            |
 * | conflict                  | 409  | no      | overwrite=true to force  |
 * | file_already_exists       | 409  | no      | overwrite=true to force  |
 * | guest_locked              | 409  | no      | already migrated         |
 * | file_too_large            | 413  | no      | upgrade tier             |
 * | storage_quota_exceeded    | 413  | no      | upgrade tier             |
 * | file_count_exceeded       | 413  | no      | upgrade tier             |
 * | daily_uploads_exceeded    | 413  | no      | wait until tomorrow      |
 * | daily_bytes_exceeded      | 413  | no      | wait until tomorrow      |
 * | bulk_too_large            | 413  | no      | smaller batch            |
 * | rate_limited              | 429  | YES (b) | exponential backoff      |
 * | account_blocked           | 423  | no      | contact support          |
 * | share_link_invalid        | 410  | no      | link revoked / expired   |
 * | internal                  | 5xx  | YES (b) | exponential backoff      |
 * | cld_sync_unavailable      | 503  | YES (b) | exponential backoff      |
 */
export type CloudFilesErrorCode =
  | "invalid_request"
  | "invalid_path"
  | "invalid_metadata"
  | "fingerprint_required"
  | "auth_required"
  | "permission_denied"
  | "guest_id_mismatch"
  | "not_found"
  | "conflict"
  | "file_already_exists"
  | "guest_locked"
  | "file_too_large"
  | "storage_quota_exceeded"
  | "file_count_exceeded"
  | "daily_uploads_exceeded"
  | "daily_bytes_exceeded"
  | "bulk_too_large"
  | "rate_limited"
  | "account_blocked"
  | "share_link_invalid"
  | "internal"
  | "cld_sync_unavailable";

// ---------------------------------------------------------------------------
// 13. Type guards
// ---------------------------------------------------------------------------

export function isCloudTreeFileRow(row: CloudTreeRow): row is CloudTreeFileRow {
  return row.kind === "file";
}

export function isCloudTreeFolderRow(
  row: CloudTreeRow,
): row is CloudTreeFolderRow {
  return row.kind === "folder";
}
