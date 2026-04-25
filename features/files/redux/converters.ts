/**
 * features/files/redux/converters.ts
 *
 * Pure functions that translate DB rows (snake_case) and REST API shapes
 * (snake_case) into the domain types (camelCase) used throughout the app.
 *
 * No Redux, no Supabase client — these are pure and testable.
 */

import type {
  CloudFile,
  CloudFileRow,
  CloudFilePermission,
  CloudFilePermissionRow,
  CloudFileVersion,
  CloudFileVersionRow,
  CloudFolder,
  CloudFolderRow,
  CloudShareLink,
  CloudShareLinkRow,
  CloudTreeRow,
  CloudUserGroup,
  CloudUserGroupMember,
  CloudUserGroupMemberRow,
  CloudUserGroupRow,
  FileRecordApi,
  GranteeType,
  PermissionLevel,
  ResourceType,
  Visibility,
} from "@/features/files/types";

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------

function toVisibility(raw: string | null | undefined): Visibility {
  return raw === "public" || raw === "shared" ? raw : "private";
}

function toPermissionLevel(raw: string | null | undefined): PermissionLevel {
  return raw === "write" || raw === "admin" ? raw : "read";
}

function toResourceType(raw: string | null | undefined): ResourceType {
  return raw === "folder" ? "folder" : "file";
}

function toGranteeType(raw: string | null | undefined): GranteeType {
  return raw === "group" ? "group" : "user";
}

function toMetadataObject(
  raw: unknown,
): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export function dbRowToCloudFile(row: CloudFileRow): CloudFile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    filePath: row.file_path,
    storageUri: row.storage_uri,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    checksum: row.checksum,
    visibility: toVisibility(row.visibility),
    currentVersion: row.current_version,
    parentFolderId: row.parent_folder_id,
    metadata: toMetadataObject(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * Convert the REST API's FileRecord (snake_case) to the domain type. Shape
 * is identical to CloudFileRow modulo a few nullable defaults.
 */
export function apiFileRecordToCloudFile(row: FileRecordApi): CloudFile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    filePath: row.file_path,
    storageUri: row.storage_uri,
    fileName: row.file_name,
    mimeType: row.mime_type ?? null,
    fileSize: row.file_size ?? null,
    checksum: row.checksum ?? null,
    visibility: toVisibility(row.visibility),
    currentVersion: row.current_version ?? 1,
    parentFolderId: row.parent_folder_id ?? null,
    metadata: toMetadataObject(row.metadata),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    deletedAt: row.deleted_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export function dbRowToCloudFolder(row: CloudFolderRow): CloudFolder {
  return {
    id: row.id,
    ownerId: row.owner_id,
    folderPath: row.folder_path,
    folderName: row.folder_name,
    parentId: row.parent_id,
    visibility: toVisibility(row.visibility),
    metadata: toMetadataObject(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export function dbRowToCloudFileVersion(
  row: CloudFileVersionRow,
): CloudFileVersion {
  return {
    id: row.id,
    fileId: row.file_id,
    versionNumber: row.version_number,
    storageUri: row.storage_uri,
    fileSize: row.file_size,
    checksum: row.checksum,
    createdBy: row.created_by,
    createdAt: row.created_at,
    changeSummary: row.change_summary,
  };
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export function dbRowToCloudFilePermission(
  row: CloudFilePermissionRow,
): CloudFilePermission {
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceType: toResourceType(row.resource_type),
    granteeId: row.grantee_id,
    granteeType: toGranteeType(row.grantee_type),
    permissionLevel: toPermissionLevel(row.permission_level),
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
  };
}

// ---------------------------------------------------------------------------
// Share links
// ---------------------------------------------------------------------------

export function dbRowToCloudShareLink(row: CloudShareLinkRow): CloudShareLink {
  const level = toPermissionLevel(row.permission_level);
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceType: toResourceType(row.resource_type),
    shareToken: row.share_token,
    permissionLevel: level === "admin" ? "write" : level,
    createdBy: row.created_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    maxUses: row.max_uses,
    useCount: row.use_count,
    isActive: row.is_active,
  };
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export function dbRowToCloudUserGroup(
  row: CloudUserGroupRow,
): CloudUserGroup {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function dbRowToCloudUserGroupMember(
  row: CloudUserGroupMemberRow,
): CloudUserGroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role,
    addedBy: row.added_by,
    addedAt: row.added_at,
  };
}

// ---------------------------------------------------------------------------
// Tree RPC — tolerant reader
// ---------------------------------------------------------------------------
//
// The RPC returns `Json` (opaque). We shape-check defensively — if the Python
// team updates the schema, only this function changes.

type LooseRow = Record<string, unknown>;

function str(row: LooseRow, key: string): string | null {
  const v = row[key];
  return typeof v === "string" ? v : null;
}

function num(row: LooseRow, key: string): number | null {
  const v = row[key];
  return typeof v === "number" ? v : null;
}

/**
 * Parse one row from `cloud_get_user_file_tree`. Returns null if the row
 * doesn't have enough shape to use.
 *
 * Supports two shapes:
 *   - Explicit `kind: 'file' | 'folder'` discriminator.
 *   - Implicit: presence of `file_name` vs `folder_name`.
 */
export function parseCloudTreeRow(raw: unknown): CloudTreeRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as LooseRow;

  const id = str(row, "id");
  if (!id) return null;

  const explicitKind = str(row, "kind");
  const hasFolderName = typeof row.folder_name === "string";
  const hasFileName = typeof row.file_name === "string";

  const isFolder =
    explicitKind === "folder" || (hasFolderName && !hasFileName);

  const created = str(row, "created_at") ?? new Date().toISOString();
  const updated = str(row, "updated_at") ?? created;
  const visibility = toVisibility(str(row, "visibility") ?? "private");
  const effPerm = str(row, "effective_permission");

  if (isFolder) {
    return {
      kind: "folder",
      id,
      folder_path: str(row, "folder_path") ?? "",
      folder_name: str(row, "folder_name") ?? "",
      parent_id: str(row, "parent_id"),
      visibility,
      effective_permission: effPerm
        ? toPermissionLevel(effPerm)
        : null,
      owner_id: str(row, "owner_id") ?? "",
      created_at: created,
      updated_at: updated,
      deleted_at: str(row, "deleted_at"),
    };
  }

  return {
    kind: "file",
    id,
    file_path: str(row, "file_path") ?? "",
    file_name: str(row, "file_name") ?? "",
    parent_folder_id: str(row, "parent_folder_id"),
    mime_type: str(row, "mime_type"),
    file_size: num(row, "file_size"),
    visibility,
    current_version: num(row, "current_version") ?? 1,
    effective_permission: effPerm
      ? toPermissionLevel(effPerm)
      : null,
    owner_id: str(row, "owner_id") ?? "",
    created_at: created,
    updated_at: updated,
    deleted_at: str(row, "deleted_at"),
  };
}

/**
 * Parse the full RPC return (array of rows). Skips malformed rows rather than
 * throwing — a single bad row shouldn't blank the tree.
 */
export function parseCloudTreeRows(raw: unknown): CloudTreeRow[] {
  if (!Array.isArray(raw)) return [];
  const out: CloudTreeRow[] = [];
  for (const item of raw) {
    const parsed = parseCloudTreeRow(item);
    if (parsed) out.push(parsed);
  }
  return out;
}
