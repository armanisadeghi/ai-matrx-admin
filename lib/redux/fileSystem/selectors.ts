// lib/redux/fileSystem/selectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import {
  FileSystemNode,
  NodeItemId,
  FileManagement,
  FileOperation,
  OperationStatus,
  SelectionState,
  AvailableBuckets,
} from "./types";
import { isStale } from "./fileSystemUtils";

// Base selector factory
const createBucketSelector =
  (bucketName: AvailableBuckets) => (state: RootState) =>
    state.fileSystem[bucketName];

const createBucketSpecificSelector = <T>(
  bucketName: AvailableBuckets,
  selector: (state: FileManagement) => T
) => createSelector(createBucketSelector(bucketName), selector);

// Active Node Selectors
export const createActiveNodeSelectors = (bucketName: AvailableBuckets) => ({
  selectActiveNode: createBucketSpecificSelector<FileSystemNode | null>(
    bucketName,
    (state) => state?.activeNode && state.nodes ? state.nodes[state.activeNode] : null
  ),

  selectActiveNodeId: createBucketSpecificSelector<NodeItemId | null>(
    bucketName,
    (state) => state.activeNode
  ),

  selectActiveNodeType: createBucketSpecificSelector<"FILE" | "FOLDER" | null>(
    bucketName,
    (state) =>
      state.activeNode ? state.nodes[state.activeNode]?.contentType : null
  ),

  selectActiveNodeMetadata: createBucketSpecificSelector(bucketName, (state) =>
    state.activeNode ? state.nodes[state.activeNode]?.metadata : null
  ),

  selectActiveNodeContent: createBucketSpecificSelector(bucketName, (state) =>
    state.activeNode ? state.nodes[state.activeNode]?.content : null
  ),

  selectActiveNodeStatus: createBucketSpecificSelector(bucketName, (state) =>
    state.activeNode
      ? {
          status: state.nodes[state.activeNode]?.status,
          operation: state.nodes[state.activeNode]?.operation,
          isLoading: state.nodesInOperation.has(state.activeNode),
          isDirty: state.nodes[state.activeNode]?.isDirty,
          isStale: state.nodes[state.activeNode]?.isStale,
        }
      : null
  ),

  // Active node convenience selectors
  selectIsActiveNodeFolder: createBucketSpecificSelector<boolean>(
    bucketName,
    (state) =>
      state.activeNode
        ? state.nodes[state.activeNode]?.contentType === "FOLDER"
        : false
  ),

  selectActiveNodeChildren: createBucketSpecificSelector<FileSystemNode[]>(
    bucketName,
    (state) => {
      if (!state.activeNode) {
        // When no active node, return root level nodes
        return Object.values(state.nodes)
          .filter((node) => node.parentId === null)
          .sort((a, b) => {
            if (a.contentType !== b.contentType) {
              return a.contentType === "FOLDER" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
      }

      // When there is an active node
      const activeNodeData = state.nodes[state.activeNode];
      if (!activeNodeData) return [];

      return Object.values(state.nodes)
        .filter((node) => node.parentId === activeNodeData.itemId)
        .sort((a, b) => {
          if (a.contentType !== b.contentType) {
            return a.contentType === "FOLDER" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
    }
  ),

  selectActiveNodeChildCount: createBucketSpecificSelector(
    bucketName,
    (state) => {
      if (!state.activeNode) return 0;
      const cache = state.nodeCache[state.activeNode];
      return cache ? cache.childNodeIds.length : 0;
    }
  ),

  selectActiveNodeFileCount: createBucketSpecificSelector(
    bucketName,
    (state) => {
      if (!state.activeNode) return 0;
      const cache = state.nodeCache[state.activeNode];
      if (!cache) return 0;
      return cache.childNodeIds
        .map((id) => state.nodes[id])
        .filter((n) => n && n.contentType === "FILE").length;
    }
  ),

  selectActiveNodeFolderCount: createBucketSpecificSelector(
    bucketName,
    (state) => {
      if (!state.activeNode) return 0;
      const cache = state.nodeCache[state.activeNode];
      if (!cache) return 0;
      return cache.childNodeIds
        .map((id) => state.nodes[id])
        .filter((n) => n && n.contentType === "FOLDER").length;
    }
  ),
});

// Selection Selectors
export const createSelectionSelectors = (bucketName: AvailableBuckets) => ({
  selectSelection: createBucketSpecificSelector<SelectionState>(
    bucketName,
    (state) => state.selection
  ),

  selectSelectedNodes: createBucketSpecificSelector<FileSystemNode[]>(
    bucketName,
    (state) =>
      Array.from(state?.selection?.selectedNodes?.values() || [])
        .map((id) => state.nodes[id])
        .filter(Boolean)
        .sort((a, b) => {
          if (a.contentType !== b.contentType) {
            return a.contentType === "FOLDER" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
  ),

  selectSelectedNodeIds: createSelector(
    [(state: RootState) => state.fileSystem[bucketName]?.selection?.selectedNodes],
    (selectedNodes) => {
      if (!selectedNodes) return [];
      return Array.from(selectedNodes);
    }
  ),

  selectSelectionCount: createBucketSpecificSelector<number>(
    bucketName,
    (state) => state.selection.selectedNodes.size
  ),

  selectHasSelection: createBucketSpecificSelector<boolean>(
    bucketName,
    (state) => state.selection.selectedNodes.size > 0
  ),

  selectIsMultiSelect: createBucketSpecificSelector<boolean>(
    bucketName,
    (state) => state.selection.selectedNodes.size > 1
  ),

  selectSelectedFileNodes: createBucketSpecificSelector<FileSystemNode[]>(
    bucketName,
    (state) =>
      Array.from(state.selection.selectedNodes)
        .map((id) => state.nodes[id])
        .filter((node): node is FileSystemNode => node?.contentType === "FILE")
  ),

  selectSelectedFolderNodes: createBucketSpecificSelector<FileSystemNode[]>(
    bucketName,
    (state) =>
      Array.from(state.selection.selectedNodes)
        .map((id) => state.nodes[id])
        .filter(
          (node): node is FileSystemNode => node?.contentType === "FOLDER"
        )
  ),
});

// Node Utility Selectors
export const createNodeUtilitySelectors = (bucketName: AvailableBuckets) => ({
  selectAllNodes: createSelector(
    [(state: RootState) => state.fileSystem[bucketName]?.nodes],
    (nodes) => {
      if (!nodes) return [];
      return Object.values(nodes);
    }
  ),

  selectNode: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<FileSystemNode | undefined>(
      bucketName,
      (state) => state?.nodes?.[nodeId]
    ),

  selectNodeExists: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<boolean>(
      bucketName,
      (state) => Boolean(state?.nodes && nodeId in state.nodes)
    ),

  selectIsNodeFolder: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<boolean>(
      bucketName,
      (state) => state?.nodes?.[nodeId]?.contentType === "FOLDER"
    ),

  selectNodeChildren: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<FileSystemNode[]>(
      bucketName,
      (state) => {
        if (!state?.nodes) return [];
        
        const nodes = Object.values(state.nodes)
          .filter((node): node is FileSystemNode => 
            Boolean(node && node.parentId === nodeId)
          );
        
        return nodes.sort((a, b) => {
          if (a.contentType !== b.contentType) {
            return a.contentType === "FOLDER" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      }
    ),

  selectRootNodes: createBucketSpecificSelector<FileSystemNode[]>(
    bucketName,
    (state) => state?.nodes ? 
      Object.values(state.nodes)
        .filter((node): node is FileSystemNode => 
          Boolean(node && node.parentId === null)
        ) : 
      []
  ),

  selectNodeChildCounts: (nodeId: NodeItemId) =>
    createBucketSpecificSelector(
      bucketName,
      (state) => {
        if (!state?.nodes || !state?.nodeCache?.[nodeId]?.childNodeIds) {
          return { total: 0, files: 0, folders: 0 };
        }

        const childNodeIds = state.nodeCache[nodeId].childNodeIds;
        const children = childNodeIds
          .map(id => state.nodes[id])
          .filter((node): node is FileSystemNode => node !== undefined);

        return {
          total: children.length,
          files: children.filter(n => n.contentType === "FILE").length,
          folders: children.filter(n => n.contentType === "FOLDER").length,
        };
      }
    ),

  selectNodeExtension: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<string | undefined>(
      bucketName,
      (state) => state?.nodes?.[nodeId]?.extension
    ),

  selectNodeMimeType: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<string | undefined>(
      bucketName,
      (state) => state?.nodes?.[nodeId]?.metadata?.mimetype
    ),

  selectNodeSize: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<number | undefined>(
      bucketName,
      (state) => state?.nodes?.[nodeId]?.metadata?.size
    ),
});

// Operation Status Selectors
export const createOperationSelectors = (bucketName: AvailableBuckets) => ({
  selectOperationLock: createBucketSpecificSelector(bucketName, (state) => ({
    isLocked: state.operationLock,
    nodesInOperation: Array.from(state.nodesInOperation),
  })),

  selectCurrentOperation: createBucketSpecificSelector<
    { type: FileOperation; status: OperationStatus } | undefined
  >(bucketName, (state) => state.currentOperation),

  selectIsLoading: createBucketSpecificSelector(
    bucketName,
    (state) => state.isLoading
  ),

  selectIsInitialized: createBucketSpecificSelector(
    bucketName,
    (state) => state.isInitialized
  ),

  selectError: createBucketSpecificSelector(bucketName, (state) => state.error),

  selectIsNodeInOperation: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<boolean>(bucketName, (state) =>
      state.nodesInOperation.has(nodeId)
    ),
});

// Parent-Child Navigation Selectors
export const createNavigationSelectors = (bucketName: AvailableBuckets) => ({
  selectCurrentParentId: createBucketSpecificSelector<NodeItemId | null>(
    bucketName,
    (state) => state.currentParentId
  ),

  selectParentNode: (nodeId: NodeItemId) =>
    createBucketSpecificSelector<FileSystemNode | undefined>(
      bucketName,
      (state) => {
        const node = state.nodes[nodeId];
        return node?.parentId ? state.nodes[node.parentId] : undefined;
      }
    ),
});

// Combined Selectors
export const createFileSystemSelectors = (bucketName: AvailableBuckets) => ({
  ...createActiveNodeSelectors(bucketName),
  ...createSelectionSelectors(bucketName),
  ...createNodeUtilitySelectors(bucketName),
  ...createOperationSelectors(bucketName),
  ...createNavigationSelectors(bucketName),
});
