// lib/redux/fileSystem/slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AvailableBuckets } from "./types";
import {
  FileManagement,
  FileOperation,
  FileSystemNode,
  NodeItemId,
  OperationStatus,
  SelectionState,
} from "./types";
import { createFileSystemOperations } from "./thunks";

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
      // Selection Management
      selectNode(
        state,
        action: PayloadAction<{
          nodeId: NodeItemId;
          isMultiSelect: boolean;
          isRangeSelect: boolean;
        }>
      ) {
        const { nodeId, isMultiSelect, isRangeSelect } = action.payload;
        const selection = state.selection;

        if (!isMultiSelect && !isRangeSelect) {
          // Single selection
          selection.selectedNodes = new Set([nodeId]);
          selection.lastSelected = nodeId;
          selection.selectionAnchor = nodeId;
          state.activeNode = nodeId; // Set active node for single selection
        } else if (isMultiSelect) {
          // Multi-selection (Ctrl/Cmd)
          if (selection.selectedNodes.has(nodeId)) {
            selection.selectedNodes.delete(nodeId);
            if (state.activeNode === nodeId) {
              state.activeNode = null;
            }
          } else {
            selection.selectedNodes.add(nodeId);
          }
          selection.lastSelected = nodeId;
          selection.selectionAnchor = nodeId;
        } else if (isRangeSelect && selection.selectionAnchor) {
          // Range selection (Shift)
          const nodes = Object.values(state.nodes);
          const anchorIndex = nodes.findIndex(
            (n) => n.itemid === selection.selectionAnchor
          );
          const targetIndex = nodes.findIndex((n) => n.itemid === nodeId);

          if (anchorIndex !== -1 && targetIndex !== -1) {
            const start = Math.min(anchorIndex, targetIndex);
            const end = Math.max(anchorIndex, targetIndex);

            selection.selectedNodes = new Set(
              nodes.slice(start, end + 1).map((n) => n.itemid)
            );
            selection.lastSelected = nodeId;
          }
        }

        console.log("Selection", selection);
        console.log("Active Node", state.activeNode);
        console.log("ALL NODES", state.nodes);
      },

      clearSelection(state) {
        state.selection = {
          selectedNodes: new Set(),
          lastSelected: undefined,
          selectionAnchor: undefined,
        };
        state.activeNode = null;
      },

      // Operation Lock Management
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
          // Also mark the node's cache entry as stale
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
          // Also mark all child nodes as stale
          cache.childNodeIds.forEach((childId) => {
            if (state.nodes[childId]) {
              state.nodes[childId].isStale = true;
            }
          });
        }
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
          const now = new Date().toISOString();

          switch (type) {
            case "listContents": {
              const nodes = status.data as FileSystemNode[];
              const parentId = nodes[0]?.parentId || null;

              console.log("List Contents", nodes);
              console.log("Parent ID", parentId);

              // Update nodes
              nodes.forEach((node) => {
                state.nodes[node.itemid] = {
                  ...node,
                  fetchedAt: now,
                  isStale: false,
                };
              });

              // Update node cache
              if (parentId !== null) {
                state.nodeCache[parentId] = {
                  timestamp: now,
                  isStale: false,
                  childNodeIds: nodes.map((n) => n.itemid),
                };
              }

              // If we're at root level and there's no active node, set the first folder as active
              if (parentId === null && !state.activeNode && nodes.length > 0) {
                const firstFolder = nodes.find(
                  (node) => node.contentType === "FOLDER"
                );
                if (firstFolder) {
                  state.activeNode = firstFolder.itemid;
                  state.selection.selectedNodes = new Set([firstFolder.itemid]);
                  state.selection.lastSelected = firstFolder.itemid;
                  state.selection.selectionAnchor = firstFolder.itemid;
                }
              }

              console.log("NODES", state.nodes);
              console.log("CACHE", state.nodeCache);
              console.log("ACTIVE NODE", state.activeNode);
              console.log("SELECTION", state.selection);

              // Set initialized flag when first listContents completes
              if (!state.isInitialized) {
                state.isInitialized = true;
              }
              break;
            }

            case "downloadFile": {
              const { nodeId, blob, metadata } = status.data;
              if (state.nodes[nodeId]) {
                state.nodes[nodeId] = {
                  ...state.nodes[nodeId],
                  content: { blob, isDirty: false },
                  isContentFetched: true,
                  metadata,
                  contentFetchedAt: now,
                  isStale: false,
                };
              }
              break;
            }

            case "getPublicFile": {
              const { nodeId, url } = status.data;
              if (state.nodes[nodeId]) {
                state.nodes[nodeId] = {
                  ...state.nodes[nodeId],
                  publicUrl: url,
                  fetchedAt: now,
                  isStale: false,
                };
              }
              break;
            }

            case "uploadFile": {
              const node = status.data as FileSystemNode;
              state.nodes[node.itemid] = {
                ...node,
                fetchedAt: now,
                contentFetchedAt: now,
                isStale: false,
              };

              // Update parent's cache to include new node
              if (node.parentId) {
                const parentCache = state.nodeCache[node.parentId];
                if (parentCache) {
                  parentCache.childNodeIds.push(node.itemid);
                  parentCache.timestamp = now;
                }
              }
              break;
            }

            case "deleteFile": {
              const nodeId = status.data as NodeItemId;
              const node = state.nodes[nodeId];
              if (node) {
                // Mark parent's cache as stale
                if (node.parentId && state.nodeCache[node.parentId]) {
                  const parentCache = state.nodeCache[node.parentId];
                  parentCache.isStale = true;
                  parentCache.childNodeIds = parentCache.childNodeIds.filter(
                    (id) => id !== nodeId
                  );
                }
                delete state.nodes[nodeId];
                delete state.nodeCache[nodeId]; // Clean up node's cache if it exists
                state.selection.selectedNodes.delete(nodeId);
                state.nodesInOperation.delete(nodeId);
                if (state.activeNode === nodeId) {
                  state.activeNode = null;
                }
              }
              break;
            }

            case "moveFile": {
              const node = status.data as FileSystemNode;
              // Update old parent's cache
              const oldNode = state.nodes[node.itemid];
              if (oldNode?.parentId && state.nodeCache[oldNode.parentId]) {
                const oldParentCache = state.nodeCache[oldNode.parentId];
                oldParentCache.childNodeIds =
                  oldParentCache.childNodeIds.filter(
                    (id) => id !== node.itemid
                  );
                oldParentCache.isStale = true;
              }

              // Update new parent's cache
              if (node.parentId && state.nodeCache[node.parentId]) {
                const newParentCache = state.nodeCache[node.parentId];
                newParentCache.childNodeIds.push(node.itemid);
                newParentCache.isStale = true;
              }

              state.nodes[node.itemid] = {
                ...node,
                fetchedAt: now,
                isStale: false,
              };
              break;
            }

            case "syncNode": {
              const node = status.data as FileSystemNode;
              if (state.nodes[node.itemid]) {
                state.nodes[node.itemid] = {
                  ...node,
                  fetchedAt: now,
                  contentFetchedAt: now,
                  isStale: false,
                };
                state.nodesInOperation.delete(node.itemid);
              }
              break;
            }
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
