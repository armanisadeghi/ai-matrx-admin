import { RootState } from "..";
import { getCachedNodes } from "./fileSystemUtils";
import { FileManagement, FileSystemNode, NodeItemId, AvailableBuckets } from "./types";


interface FileSystemDetails {
  state: FileManagement;
  activeNode: FileSystemNode | null;
  parentId: NodeItemId | null;
  storagePath: string;
  cachedNodes: FileSystemNode[] | null;
  parentPath: string;
}

export function getFileSystemDetails(
  bucketName: AvailableBuckets,
  getState: () => RootState
): FileSystemDetails {
  const state = getState().fileSystem[bucketName];

  if (!state) {
    throw new Error(
      `Bucket "${bucketName}" does not exist in the file system state.`
    );
  }

  const activeNode: FileSystemNode | null = state.activeNode
    ? state.nodes[state.activeNode]
    : null;
  const storagePath: string = activeNode?.storagePath || "";
  const parentId: NodeItemId | null = activeNode?.itemId || null;
  
  // CRITICAL FIX: Ensure parentPath always points to a FOLDER, not a FILE
  // If activeNode is a FILE, use its parent folder's path instead
  const parentPath: string = activeNode?.contentType === 'FOLDER' 
    ? activeNode.storagePath 
    : (activeNode?.parentId && activeNode.parentId !== 'root'
        ? state.nodes[activeNode.parentId]?.storagePath || ""
        : "");

  const cachedNodes: FileSystemNode[] | null = getCachedNodes(
    state.nodeCache,
    state.nodes,
    parentId
  );

  return {
    state,
    activeNode,
    parentId,
    parentPath,
    storagePath,
    cachedNodes,
  };
}


interface FileSystemDetailsWithSelection {
  state: FileManagement;
  selectedNodes: FileSystemNode[];
  parentId: NodeItemId | null;
  storagePath: string;
  cachedNodes: FileSystemNode[] | null;
  parentPath: string;
}

export function getFileSystemDetailsWithSelection(
  bucketName: AvailableBuckets,
  getState: () => RootState
): FileSystemDetailsWithSelection {
  const state = getState().fileSystem[bucketName];

  if (!state) {
    throw new Error(
      `Bucket "${bucketName}" does not exist in the file system state.`
    );
  }

  const selectedNodes: FileSystemNode[] = Array.from(state.selection.selectedNodes)
    .map((nodeId) => state.nodes[nodeId])
    .filter((node): node is FileSystemNode => Boolean(node)); // Filter out undefined nodes

  const firstSelectedNode = selectedNodes[0] || null;
  const storagePath: string = firstSelectedNode?.storagePath || "";
  const parentId: NodeItemId | null = firstSelectedNode?.itemId || null;
  const parentPath: string = firstSelectedNode?.storagePath || "";

  const cachedNodes: FileSystemNode[] | null = getCachedNodes(
    state.nodeCache,
    state.nodes,
    parentId
  );

  return {
    state,
    selectedNodes,
    parentId,
    parentPath,
    storagePath,
    cachedNodes,
  };
}


export const isFreshData = (
    fetchedAt: string | null,
    staleDuration: number,
    isStale: boolean = false
  ): boolean => {
    if (!fetchedAt || isStale) {
      return false;
    }
  
    const lastFetchTime = new Date(fetchedAt).getTime();
    const currentTime = new Date().getTime();
    const timeSinceLastFetch = currentTime - lastFetchTime;
  
    return timeSinceLastFetch < staleDuration;
  };
  
  