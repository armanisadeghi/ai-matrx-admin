// fileSystemUtils.ts
import { v4 as uuidv4 } from "uuid";
import {
  FileSystemNode,
  StorageMetadata,
  SupabaseStorageItem,
  NodeContentType,
  NodeContent,
  NodeStatus,
  NodeOperation,
} from "./types";

// Core timing constants
const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds

export function isStale(timestamp: string | null): boolean {
  if (!timestamp) return true;
  const fetchTime = new Date(timestamp).getTime();
  return Date.now() - fetchTime > STALE_THRESHOLD;
}

export function processStorageMetadata(
  item: SupabaseStorageItem
): StorageMetadata {
  const metadata = item.metadata || {};

  return {
    name: item.name || "",
    id: item.id,
    updated_at: item.updated_at,
    created_at: item.created_at,
    last_accessed_at: item.last_accessed_at,
    eTag: metadata.eTag || "",
    size: metadata.size || 0,
    mimetype: metadata.mimetype || "",
    cacheControl: metadata.cacheControl || "",
    lastModified: metadata.lastModified || "",
    contentLength: metadata.contentLength || 0,
    httpStatusCode: metadata.httpStatusCode || 200,
  };
}

export function createNodeFromStorageItem(
  item: SupabaseStorageItem,
  parentPath: string | null = null,
  content?: NodeContent
): FileSystemNode {
  const isFolder = item.id === null;
  const now = new Date().toISOString();

  // Just use regular UUID for itemid
  const nodeId = uuidv4();

  // Properly handle storage paths
  let storagePath = "";
  if (isFolder) {
    // For folders, use the name as the path component
    storagePath = parentPath ? `${parentPath}/${item.name}` : item.name;
  } else {
    // For files, use the Supabase ID which is the full path
    storagePath = item.id || "";
  }

  // Normalize the path
  storagePath = normalizeStoragePath(storagePath);

  const contentType: NodeContentType = isFolder ? "FOLDER" : "FILE";
  const extension = isFolder ? "" : item.name.split(".").pop() || "";

  // For folders, metadata is always considered fetched since they don't have any
  const isMetadataFetched = isFolder ? true : !!item.metadata;

  return {
    itemid: nodeId,
    storagePath,
    parentId: parentPath, // This should be the ID of the parent node
    name: item.name,
    contentType,
    extension,
    isMetadataFetched,
    metadata: isFolder ? undefined : processStorageMetadata(item),
    isContentFetched: !!content,
    content,
    status: "idle" as NodeStatus,
    operation: "none" as NodeOperation,
    isDirty: false,
    fetchedAt: now,
    contentFetchedAt: content ? now : null,
    isStale: false,
    lastSynced: now,
    syncError: undefined,
    publicUrl: undefined,
  };
}

export function normalizeStoragePath(path: string): string {
  if (!path) return "";
  // Remove leading and trailing slashes
  return (
    path
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      // Replace multiple consecutive slashes with a single slash
      .replace(/\/+/g, "/")
  );
}

// Add helper to get full path for a node
export function getNodePath(
  node: FileSystemNode,
  nodes: Record<string, FileSystemNode>
): string {
  let path = node.storagePath;
  let current = node;

  while (current.parentId) {
    const parent = nodes[current.parentId];
    if (!parent) break;
    path = `${parent.storagePath}/${path}`;
    current = parent;
  }

  return normalizeStoragePath(path);
}

// In fileSystemUtils.ts
export function shouldFetchList(cache: { timestamp: string; isStale: boolean } | undefined): boolean {
    if (!cache) return true;
    return cache.isStale || isStale(cache.timestamp);
}
// Update check functions
export function shouldFetchContent(node: FileSystemNode): boolean {
  if (!node) return false;
  if (node.contentType === "FOLDER") return false; // Folders don't have content
  if (!node.isContentFetched) return true;
  if (node.isDirty) return false;
  return isStale(node.contentFetchedAt);
}

export function shouldFetchMetadata(node: FileSystemNode): boolean {
  if (!node) return false;
  if (node.contentType === "FOLDER") return false; // Folders don't have metadata
  if (!node.isMetadataFetched) return true;
  return isStale(node.fetchedAt);
}

export function isNodeValid(node: FileSystemNode): boolean {
  if (!node) return false;
  return (
    typeof node.itemid === "string" &&
    typeof node.name === "string" &&
    (typeof node.parentId === "string" || node.parentId === null) &&
    typeof node.storagePath === "string" &&
    (node.contentType === "FILE" || node.contentType === "FOLDER") &&
    // Additional validations
    (node.contentType === "FOLDER"
      ? !node.metadata && !node.content // Folders shouldn't have metadata or content
      : true) // Files can have either
  );
}

// Metadata consistency check
export function hasConsistentMetadata(node: FileSystemNode): boolean {
  if (node.contentType === "FOLDER") {
    return !node.metadata;
  }
  return node.isMetadataFetched ? !!node.metadata : true;
}
