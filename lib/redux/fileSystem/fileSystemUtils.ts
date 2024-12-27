// fileSystemUtils.ts
import { v4 as uuidv4 } from "uuid";
import {
  FileSystemNode,
  StorageMetadata,
  SupabaseStorageItem,
  NodeContentType,
  NodeContent,
  NodeStatus,
  NodeCache,
  ListOptions,
  AvailableBuckets,
  FileManagement,
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

export interface CreateNodeOptions {
  bucket: AvailableBuckets,
  item: SupabaseStorageItem,
  parentId: string | null,
  parentPath: string | null,
  content?: NodeContent
}


export function createNodeFromStorageItem(
  bucket: AvailableBuckets,
  item: SupabaseStorageItem,
  parentId: string | null = null,
  parentPath: string | null = null,
  content?: NodeContent
): FileSystemNode {
  
  const isFolder = item.id === null;
  const now = new Date().toISOString();
  const nodeId = uuidv4();

  parentId = parentId ?? `root`;


  // Properly handle storage paths
  const path = parentPath ? `${parentPath}/${item.name}` : item.name;
  const storagePath = normalizeStoragePath(path);

  const contentType: NodeContentType = isFolder ? "FOLDER" : "FILE";
  const extension = isFolder ? "" : item.name.split(".").pop() || "";

  // For folders, metadata is always considered fetched since they don't have any
  const isMetadataFetched = isFolder ? true : !!item.metadata;

  return {
    itemId: nodeId,
    bucket,
    storagePath,
    parentId: parentId,
    name: item.name,
    contentType,
    extension,
    isMetadataFetched,
    metadata: isFolder ? undefined : processStorageMetadata(item),
    isContentFetched: !!content,
    content,
    status: "idle",
    operation: null,
    isDirty: false,
    fetchedAt: now,
    childrenFetchedAt: null,
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
export function shouldFetchList(
  cache: { timestamp: string; isStale: boolean } | undefined
): boolean {
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
    typeof node.itemId === "string" &&
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



export function getCachedNodes(
  nodeCache: Record<string, NodeCache>,
  nodes: Record<string, FileSystemNode>,
  parentId: string | null
): FileSystemNode[] | null {
  if (!parentId || !nodeCache[parentId]) return null;
  const cache = nodeCache[parentId];

  if (cache.isStale || shouldFetchList(cache)) return null;

  return cache.childNodeIds.map((id) => nodes[id]).filter(Boolean);
}


function filterNodes(
  nodes: FileSystemNode[],
  filterOptions?: ListOptions["filter"]
): FileSystemNode[] {
  if (!filterOptions) return nodes;

  let filteredNodes = [...nodes];

  if (filterOptions.contentType) {
    filteredNodes = filteredNodes.filter((node) =>
      filterOptions.contentType.includes(node.contentType)
    );
  }

  if (filterOptions.extension) {
    filteredNodes = filteredNodes.filter((node) =>
      filterOptions.extension.includes(node.extension)
    );
  }

  return filteredNodes;
}

function sortNodes(
  nodes: FileSystemNode[],
  sortBy?: ListOptions["sortBy"]
): FileSystemNode[] {
  if (!sortBy) return nodes;

  return [...nodes].sort((a, b) => {
    if (a.contentType !== b.contentType) {
      return a.contentType === "FOLDER" ? -1 : 1;
    }

    const aVal = a[sortBy.column as keyof FileSystemNode];
    const bVal = b[sortBy.column as keyof FileSystemNode];

    return sortBy.order === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });
}

function limitNodes(
  nodes: FileSystemNode[],
  limit?: ListOptions["limit"]
): FileSystemNode[] {
  return limit ? nodes.slice(0, limit) : nodes;
}

export function normalNodeSort(nodes: FileSystemNode[]): FileSystemNode[] {
  return nodes.sort((a, b) => {
    if (a.contentType !== b.contentType) {
      return a.contentType === "FOLDER" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

const HIDDEN_FILE_NAMES = [
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  ".emptyFolderPlaceholder",
];
const HIDDEN_FILE_EXTENSIONS = [
  "DS_Store",
  "Thumbs",
  "db",
  "desktop",
  "ini",
  "emptyFolderPlaceholder",
];
const HIDDEN_DIRECTORY_NAMES = [
  ".git",
  ".github",
  ".vscode",
  "node_modules",
  ".history",
  "venv",
  "env",
];

export function isHiddenNode(node: FileSystemNode): boolean {
  if (node.contentType === "FOLDER") {
    return HIDDEN_DIRECTORY_NAMES.includes(node.name);
  }

  return (
    HIDDEN_FILE_NAMES.includes(node.name) ||
    HIDDEN_FILE_EXTENSIONS.includes(node.extension)
  );
}

export function filterHiddenNodes(nodes: FileSystemNode[]): FileSystemNode[] {
  return nodes.filter((node) => !isHiddenNode(node));
}

export function processNodes(
  nodes: FileSystemNode[],
  options?: ListOptions
): FileSystemNode[] {
  const safeOptions = options || {};

  let processedNodes = filterNodes(nodes, safeOptions.filter) as FileSystemNode[];

  processedNodes = safeOptions.sortBy
    ? sortNodes(processedNodes, safeOptions.sortBy) as FileSystemNode[]
    : normalNodeSort(processedNodes) as FileSystemNode[];

  processedNodes = filterHiddenNodes(processedNodes);
  processedNodes = limitNodes(processedNodes, safeOptions.limit);

  return processedNodes;
}


export function getNewPath(fullPath: string, newName: string): string {
  const pathParts = fullPath.split('/');
  const parentPath = pathParts.slice(0, -1).join('/');
  return parentPath ? `${parentPath}/${newName}` : newName;
}



export type OptimisticUpdate = {
  previousState: FileSystemNode;
  updatedState: FileSystemNode;
  nodeId: string;
};

// 1. Optimistic update helper
export const createOptimisticRenameUpdate = (
  node: FileSystemNode,
  newName: string
): OptimisticUpdate => {
  const newPath = getNewPath(node.storagePath, newName);
  const now = new Date().toISOString();
  
  // Maintain all existing properties while only updating necessary ones
  const optimisticNode = {
    ...node,
    name: newName,
    storagePath: newPath,
    isDirty: true,
    lastSynced: now,
    fetchedAt: now,
    // Don't change other properties like parentId, itemId, content, metadata, etc.
  };

  return {
    previousState: { ...node },
    updatedState: optimisticNode,
    nodeId: node.itemId
  };
};

// 2. Revert helper
export const revertRenameUpdate = (
  state: FileManagement,
  update: OptimisticUpdate
) => {
  state.nodes[update.nodeId] = {
    ...update.previousState,
    isStale: true, // Mark as stale to ensure next fetch
  };
};

// 3. Apply server update helper
export const applyServerRenameUpdate = (
  state: FileManagement,
  updatedNode: FileSystemNode,
  oldNodeId: string
) => {
  // If the ID changed, remove the old node
  if (updatedNode.itemId !== oldNodeId) {
    delete state.nodes[oldNodeId];
  }
  
  // Update or add the new node
  state.nodes[updatedNode.itemId] = {
    ...updatedNode,
    isDirty: false,
    lastSynced: new Date().toISOString(),
    isStale: false,
  };
};


interface DuplicateCheckResult {
  shouldUpdate: boolean;
  nodeToKeep: FileSystemNode;
  nodeToRemove?: FileSystemNode;
  requiresBackup?: boolean;
}

