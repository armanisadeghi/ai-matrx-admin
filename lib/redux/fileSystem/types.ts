// lib/redux/fileSystem/types.ts
import { AsyncThunk, PayloadAction, Reducer } from "@reduxjs/toolkit";
import { availableBuckets } from "../rootReducer";

// Core System Types
export type AvailableBuckets = (typeof availableBuckets)[number];
export const FILE_SYSTEM_ACTION_PREFIX = "fileSystem";

// Node Core Types
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

export type FileOperation =
  | "listContents"
  | "downloadFile"
  | "uploadFile"
  | "deleteFile"
  | "moveFile"
  | "getPublicFile"
  | "createFile"
  | "createFolder"
  | "renameActiveNode"
  | "duplicateSelections"
  | "moveSelections"
  | "deleteSelections"
  | "deleteActiveNode"
  | "syncNode";

// Storage Types
export interface SupabaseStorageItem {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_accessed_at: string | null;
  metadata: {
    eTag?: string;
    size?: number;
    mimetype?: string;
    cacheControl?: string;
    lastModified?: string;
    contentLength?: number;
    httpStatusCode?: number;
  } | null;
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

// Node Content and Structure
export interface NodeContent {
  blob: Blob;
  isDirty: boolean;
  tempId?: string;
}

export interface FileSystemNode {
  itemId: NodeItemId;
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
  operation: FileOperation;

  isDirty: boolean;
  lastSynced?: string;
  syncError?: string;
  publicUrl?: string;
  fetchedAt: string | null;
  childrenFetchedAt: string | null;
  contentFetchedAt: string | null;
  isStale: boolean;
  bucket: AvailableBuckets;
}

// Cache Management
export interface NodeCache {
  timestamp: string;
  isStale: boolean;
  childNodeIds: NodeItemId[];
}

// Selection State
export interface SelectionState {
  selectedNodes: Set<NodeItemId>;
  lastSelected?: NodeItemId;
  selectionAnchor?: NodeItemId;
}

// State Management
export interface FileManagement {
  nodes: Record<NodeItemId, FileSystemNode>;
  selection: SelectionState;
  activeNode: NodeItemId | null;
  isInitialized: boolean;
  isLoading: boolean;

  operationLock: boolean;
  nodesInOperation: Set<NodeItemId>;
  error: string | null;
  currentOperation?: {
    type: FileOperation;
    status: OperationStatus;
  };

  nodeCache: Record<NodeItemId, NodeCache>;
  staleDuration: number;
  currentParentId: NodeItemId | null;
}

// Common operation interfaces
export interface ListOptions {
  limit?: number;
  sortBy?: {
    column: string;
    order: "asc" | "desc";
  };
  forceFetch?: boolean;
  filter?: {
    contentType?: string[];
    extension?: string[];
  };
}

export interface BatchOperationOptions {
  forceFetch?: boolean;
  parallel?: boolean;
  continueOnError?: boolean;
  batchSize?: number;
}
export interface SyncOptions {
  forceFetch?: boolean;
  validateContent?: boolean;
  syncContent?: boolean; // Whether to sync file content or just metadata
  batch?: BatchOperationOptions;
}

export interface DownloadOptions {
  forceFetch?: boolean;
  preferCache?: boolean;
  validateChecksum?: boolean;
}

export interface UploadOptions {
  overwrite?: boolean;
  preserveMetadata?: boolean;
  contentType?: string;
  cacheControl?: string;
  targetPath?: string; // Explicit upload destination path (folder path)
}

export interface MoveOptions {
  overwrite?: boolean;
  preserveMetadata?: boolean;
  batch?: BatchOperationOptions;
}

export interface CreateFileOptions extends UploadOptions {
  name: string;
  content: File | Blob;
  parentId?: NodeItemId | null; // If not provided, creates at root
  metadata?: Partial<StorageMetadata>;
}

// Operation Types
export interface OperationStatus {
  isLoading: boolean;
  error?: string | null;
  data?: any;
}

// Updated Action Types
export interface UpdateNodePayload {
  nodeId: NodeItemId;
  updates: Partial<FileSystemNode>;
}

// Thunk Types
export interface ThunkConfig {
  rejectValue: string;
}

// Action Types for FileSystem Slice
export interface FileSystemSlice {
  reducer: Reducer<FileManagement>;
  actions: FileSystemActionTypes;
}

export interface FileSystemActionTypes {
  // Slice actions (synchronous)
  selectNode: (payload: {
    nodeId: NodeItemId;
    isMultiSelect: boolean;
    isRangeSelect: boolean;
  }) => PayloadAction<{
    nodeId: NodeItemId;
    isMultiSelect: boolean;
    isRangeSelect: boolean;
  }>;
  clearSelection: () => PayloadAction<void>;
  acquireOperationLock: (payload: {
    operation: FileOperation;
    nodeIds: NodeItemId[];
  }) => PayloadAction<{
    operation: FileOperation;
    nodeIds: NodeItemId[];
  }>;
  releaseOperationLock: () => PayloadAction<void>;
  updateNode: (payload: UpdateNodePayload) => PayloadAction<UpdateNodePayload>;
  markNodeStale: (payload: {
    nodeId: NodeItemId;
  }) => PayloadAction<{ nodeId: NodeItemId }>;
  setOperationStatus: (payload: {
    type: FileOperation;
    status: OperationStatus;
  }) => PayloadAction<{
    type: FileOperation;
    status: OperationStatus;
  }>;

  // Thunk actions with updated signatures
  listContents: AsyncThunk<FileSystemNode[], ListOptions, ThunkConfig>;
  downloadFile: AsyncThunk<
    { nodeId: NodeItemId; blob: Blob; metadata: StorageMetadata },
    DownloadOptions | undefined,
    ThunkConfig
  >;
  uploadFile: AsyncThunk<
    FileSystemNode,
    { file: File; options?: UploadOptions },
    ThunkConfig
  >;
  deleteFiles: AsyncThunk<
    NodeItemId[],
    BatchOperationOptions | undefined,
    ThunkConfig
  >;
  moveFiles: AsyncThunk<
    FileSystemNode[],
    { destinationNodeId: NodeItemId; options?: MoveOptions },
    ThunkConfig
  >;
  getPublicFile: AsyncThunk<
    { nodeId: NodeItemId; url: string },
    void,
    ThunkConfig
  >;
  syncNode: AsyncThunk<FileSystemNode, SyncOptions | undefined, ThunkConfig>;

  // New thunk action
  deleteActiveNode: AsyncThunk<NodeItemId, void, ThunkConfig>;
  renameActiveNode: AsyncThunk<FileSystemNode[], { newName: string }, ThunkConfig>;

  createFile: AsyncThunk<FileSystemNode, CreateFileOptions, ThunkConfig>;
  createFolder: AsyncThunk<FileSystemNode, { name: string; parentId?: NodeItemId | null }, ThunkConfig>;

}
