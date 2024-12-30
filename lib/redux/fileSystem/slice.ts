// lib/redux/fileSystem/slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AvailableBuckets, FileSystemNode } from "./types";
import {
  FileManagement,
  FileOperation,
  NodeItemId,
  OperationStatus,
} from "./types";
import { createFileSystemOperations } from "./thunks";
import {
  handleListContents,
  handleDownloadFile,
  handleGetPublicFile,
  handleUploadFile,
  handleDeleteFile,
  handleMoveFile,
  handleSyncNode,
  handleNodeSelection,
  handleRenameActiveNode,
  handleDuplicateSelections,
  handleMoveSelections,
} from "./sliceHelpers";
import {
  applyServerRenameUpdate,
  OptimisticUpdate,
  revertRenameUpdate,
} from "./fileSystemUtils";

// Initial State
export const initialState: FileManagement = {
  nodes: {},
  activeNode: null,
  selection: {
    selectedNodes: new Set<NodeItemId>(),
    lastSelected: undefined,
    selectionAnchor: undefined,
  },
  isInitialized: false,
  isLoading: false,
  operationLock: false,
  nodesInOperation: new Set(),
  error: null,
  nodeCache: {},
  staleDuration: 30 * 60 * 1000, // 30 minutes in milliseconds
  currentParentId: null,
};

export const createFileSystemSlice = (
  bucketName: AvailableBuckets,
  customInitialState: FileManagement = initialState
) => {
  const slice = createSlice({
    name: `fileSystem/${bucketName}`,
    initialState: customInitialState,
    reducers: {
      selectNode(
        state: FileManagement,
        action: PayloadAction<{
          nodeId: NodeItemId;
          isMultiSelect: boolean;
          isRangeSelect: boolean;
        }>
      ) {
        const { nodeId, isMultiSelect, isRangeSelect } = action.payload;
        handleNodeSelection(state, nodeId, isMultiSelect, isRangeSelect);
      },

      clearSelection(state: FileManagement) {
        state.selection = {
          selectedNodes: new Set(),
          lastSelected: undefined,
          selectionAnchor: undefined,
        };
        state.activeNode = null;
      },

      acquireOperationLock(
        state,
        action: PayloadAction<{
          operation: FileOperation;
          nodeIds: NodeItemId[];
        }>
      ) {
        if (!state.operationLock) {
          state.operationLock = true;
          state.nodesInOperation = new Set(action.payload.nodeIds);
          state.currentOperation = {
            type: action.payload.operation,
            status: { isLoading: true },
          };
        }
      },

      releaseOperationLock(state) {
        state.operationLock = false;
        state.nodesInOperation = new Set();
        state.currentOperation = undefined;
      },

      updateNode(
        state,
        action: PayloadAction<{
          nodeId: NodeItemId;
          updates: Partial<FileSystemNode>;
        }>
      ) {
        const { nodeId, updates } = action.payload;
        if (state.nodes[nodeId]) {
          state.nodes[nodeId] = {
            ...state.nodes[nodeId],
            ...updates,
          };
        }
      },

      markNodeStale(state, action: PayloadAction<{ nodeId: NodeItemId }>) {
        const node = state.nodes[action.payload.nodeId];
        if (node) {
          node.isStale = true;
          if (state.nodeCache[action.payload.nodeId]) {
            state.nodeCache[action.payload.nodeId].isStale = true;
          }
        }
      },

      markNodeChildrenStale(
        state,
        action: PayloadAction<{ nodeId: NodeItemId }>
      ) {
        const cache = state.nodeCache[action.payload.nodeId];
        if (cache) {
          cache.isStale = true;
          cache.childNodeIds.forEach((childId) => {
            if (state.nodes[childId]) {
              state.nodes[childId].isStale = true;
            }
          });
        }
      },

      startNodeOperation(
        state: FileManagement,
        action: PayloadAction<{ nodeId: NodeItemId; operation: FileOperation }>
      ) {
        const { nodeId, operation } = action.payload;
        state.nodesInOperation.add(nodeId);
        if (state.nodes[nodeId]) {
          state.nodes[nodeId].status = "operation_pending";
          state.nodes[nodeId].operation = operation;
        }
        state.currentOperation = {
          type: operation,
          status: { isLoading: true },
        };
      },

      applyOptimisticRename: (
        state: FileManagement,
        action: PayloadAction<OptimisticUpdate>
      ) => {
        const { nodeId, updatedState } = action.payload;
        state.nodes[nodeId] = updatedState;
      },

      revertRename: (
        state: FileManagement,
        action: PayloadAction<OptimisticUpdate>
      ) => {
        revertRenameUpdate(state, action.payload);
      },

      applyServerRename: (
        state: FileManagement,
        action: PayloadAction<{
          updatedNode: FileSystemNode;
          oldNodeId: string;
        }>
      ) => {
        const { updatedNode, oldNodeId } = action.payload;
        applyServerRenameUpdate(state, updatedNode, oldNodeId);
      },

      setOperationStatus(
        state,
        action: PayloadAction<{
          type: FileOperation;
          status: OperationStatus;
        }>
      ) {
        const { type, status } = action.payload;
        state.isLoading = status.isLoading;
        state.error = status.error || null;
        state.currentOperation = { type, status };

        if (status.data) {
          switch (type) {
            case "listContents":
              handleListContents(state, status);
              break;

            case "downloadFile":
              handleDownloadFile(state, status);
              break;

            case "getPublicFile":
              handleGetPublicFile(state, status);
              break;

            case "uploadFile":
              handleUploadFile(state, status);
              break;

            case "deleteFile":
              handleDeleteFile(state, status);
              break;

            case "moveFile":
              handleMoveFile(state, status);
              break;

            case "renameActiveNode":
              handleRenameActiveNode(state, status);
              break;

            case "duplicateSelections":
              handleDuplicateSelections(state, status);
              break;

            case "moveSelections":
              handleMoveSelections(state, status);
              break;

            case "deleteActiveNode":
              handleDeleteFile(state, status);
              break;

            case "syncNode":
              handleSyncNode(state, status);
              break;

            case "getPublicFile":
              handleGetPublicFile(state, status);
              break;

            default:
              console.warn(`Unhandled operation type: ${type}`);
          }
        }

        if (!status.isLoading) {
          state.operationLock = false;
          state.nodesInOperation = new Set();
        }
      },

      setCurrentParent(state, action: PayloadAction<NodeItemId | null>) {
        state.currentParentId = action.payload;
      },
    },
  });

  const operations = createFileSystemOperations(bucketName);

  return {
    reducer: slice.reducer,
    actions: {
      ...slice.actions,
      ...operations,
    },
  };
};
