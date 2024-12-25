// lib/redux/fileSystem/types.ts

export const FILE_SYSTEM_ACTION_PREFIX = "fileSystem";

export interface NodeContent {
  blob: Blob;
  isDirty: boolean;
  tempId?: string;
}

export interface StorageMetadata {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_accessed_at: string | null;
  eTag: string;
  size: number;
  mimetype: string;
  cacheControl: string;
  lastModified: string;
  contentLength: number;
  httpStatusCode: number;
}

// Node types
export type NodeItemId = string;
export type NodeContentType = "FILE" | "FOLDER";
export type NodeStatus =
  | "idle"
  | "loading_content"
  | "loading_metadata"
  | "loading_children"
  | "operation_pending"
  | "error"
  | "success";

export type NodeOperation =
  | "none"
  | "rename"
  | "move"
  | "delete"
  | "updating_content";

export interface FileSystemNode {
  itemid: NodeItemId;
  storagePath: string;
  parentId: string | null;
  name: string;
  contentType: NodeContentType;
  extension: string;
  isMetadataFetched: boolean;
  metadata?: StorageMetadata;
  isContentFetched: boolean;
  content?: NodeContent;
  status: NodeStatus;
  operation: NodeOperation;
  isDirty: boolean;
  lastSynced?: string;
  syncError?: string;
  publicUrl?: string; // Add this field
}

// State types
export interface FileManagement {
  nodes: Record<NodeItemId, FileSystemNode>;
  selectedNodes: Set<NodeItemId>;
  isInitialized: boolean;
  isLoading: boolean;
  operationLock: boolean;
  nodesInOperation: Set<NodeItemId>;
  error: string | null;
  currentOperation?: {
    type: string;
    status: OperationStatus;
  };
}

// Operation types
export interface OperationStatus {
  isLoading: boolean;
  error?: string | null;
  data?: any;
}

export type OperationResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Thunk types
export interface ThunkConfig {
  rejectValue: string;
}

// Operation specific types
export interface FetchNodeMetadataResult {
  nodeId: NodeItemId;
  metadata: StorageMetadata;
}

export interface FetchNodeContentResult {
  nodeId: NodeItemId;
  content: NodeContent;
}

export interface UpdateNodeContentArgs {
  nodeId: NodeItemId;
  content: Blob;
}

export interface MoveNodeArgs {
  nodeId: NodeItemId;
  newParentId: NodeItemId;
}

export interface RenameNodeArgs {
  nodeId: NodeItemId;
  newName: string;
}

// Action payload types
export interface SetOperationStatusPayload {
  type: string;
  status: OperationStatus;
}

export interface UpdateNodePayload {
  nodeId: NodeItemId;
  updates: Partial<FileSystemNode>;
}

// Initial state
export const initialState: FileManagement = {
  nodes: {},
  selectedNodes: new Set(),
  isInitialized: false,
  isLoading: false,
  operationLock: false,
  nodesInOperation: new Set(),
  error: null,
};
