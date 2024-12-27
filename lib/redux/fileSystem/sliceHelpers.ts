import {
  NodeItemId,
  FileSystemNode,
  FileManagement,
  OperationStatus,
} from "./types";

export const handleNodeSelection = (
  state: FileManagement,
  nodeId: NodeItemId,
  isMultiSelect: boolean,
  isRangeSelect: boolean
) => {
  const { selection } = state;

  if (!isMultiSelect && !isRangeSelect) {
    selection.selectedNodes = new Set([nodeId]);
    selection.lastSelected = nodeId;
    selection.selectionAnchor = nodeId;
    state.activeNode = nodeId;
  } else if (isMultiSelect) {
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
    const nodes = Object.values(state.nodes);
    const anchorIndex = nodes.findIndex(
      (n) => n.itemId === selection.selectionAnchor
    );
    const targetIndex = nodes.findIndex((n) => n.itemId === nodeId);

    if (anchorIndex !== -1 && targetIndex !== -1) {
      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);

      selection.selectedNodes = new Set(
        nodes.slice(start, end + 1).map((n) => n.itemId)
      );
      selection.lastSelected = nodeId;
    }
  }
};

export const handleListContents = (
  state: FileManagement,
  status: OperationStatus
) => {
  const now = new Date().toISOString();
  const nodes = status.data as FileSystemNode[];
  const parentId = nodes[0]?.parentId || null;

  // Update all fetched nodes with duplicate checking
  nodes.forEach((node) => {
    const nodeWithTimestamp = { ...node, fetchedAt: now, isStale: false };
    const result = checkAndResolveDuplicates(state, nodeWithTimestamp);

    if (result.nodeToRemove) {
      delete state.nodes[result.nodeToRemove.itemId];
    }

    // We always want to use the new data in this case since it's a fresh fetch
    state.nodes[result.nodeToKeep.itemId] = result.nodeToKeep;

    // If we found a duplicate with content, log it for debugging
    if (result.requiresBackup) {
      console.warn(`Found duplicate with content for path: ${node.storagePath}`);
      // TODO: Implement backup logic when needed
      // pushToSupabaseTemp(result.nodeToRemove!);
    }
  });

  // Update the parent node to reflect that children have been fetched
  if (parentId && state.nodes[parentId]) {
    state.nodes[parentId] = {
      ...state.nodes[parentId],
      childrenFetchedAt: now,
      isStale: false
    };
  }

  // Handle root level initialization
  if (parentId === null && !state.activeNode && nodes.length > 0) {
    const firstFolder = nodes.find((node) => node.contentType === "FOLDER");
    if (firstFolder) {
      state.activeNode = firstFolder.itemId;
      state.selection.selectedNodes = new Set([firstFolder.itemId]);
      state.selection.lastSelected = firstFolder.itemId;
      state.selection.selectionAnchor = firstFolder.itemId;
    }
  }

  if (!state.isInitialized) {
    state.isInitialized = true;
  }
};

export const handleDownloadFile = (
  state: FileManagement,
  status: OperationStatus
) => {
  const now = new Date().toISOString();
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
};

export const handleGetPublicFile = (
  state: FileManagement,
  status: OperationStatus
) => {
  const now = new Date().toISOString();
  const { nodeId, url } = status.data;

  if (state.nodes[nodeId]) {
    state.nodes[nodeId] = {
      ...state.nodes[nodeId],
      publicUrl: url,
      fetchedAt: now,
      isStale: false,
    };
  }
};

export const handleUploadFile = (
  state: FileManagement,
  status: OperationStatus
) => {
  const now = new Date().toISOString();
  const node = status.data as FileSystemNode;

  state.nodes[node.itemId] = {
    ...node,
    fetchedAt: now,
    contentFetchedAt: now,
    isStale: false,
  };

  // Update parent's cache to include new node
  if (node.parentId) {
    const parentCache = state.nodeCache[node.parentId];
    if (parentCache) {
      parentCache.childNodeIds.push(node.itemId);
      parentCache.timestamp = now;
    }
  }
};

export const handleDeleteFile = (
  state: FileManagement,
  status: OperationStatus
) => {
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

    // Remove the node and associated cache
    delete state.nodes[nodeId];
    delete state.nodeCache[nodeId];

    // Update selection and operation tracking
    state.selection.selectedNodes.delete(nodeId);
    state.nodesInOperation.delete(nodeId);

    if (state.activeNode === nodeId) {
      state.activeNode = null;
    }
  }
};

export const handleRenameActiveNode = (
  state: FileManagement,
  status: OperationStatus
) => {
  console.log("handleRenameActiveNode", status);
  const now = new Date().toISOString();
  const nodes = status.data as FileSystemNode[];

  nodes.forEach((node) => {
    state.nodes[node.itemId] = { ...node, fetchedAt: now, isStale: false };
    completeNodeOperation(state, { nodeId: node.itemId });
  });
};

export const handleDuplicateSelections = (
  state: FileManagement,
  status: OperationStatus
) => {
  console.log("handleDuplicateSelections", status);
  const now = new Date().toISOString();
  const nodes = status.data as FileSystemNode[];

  nodes.forEach((node) => {
    state.nodes[node.itemId] = { ...node, fetchedAt: now, isStale: false };
    completeNodeOperation(state, { nodeId: node.itemId });
  });
};

export const handleMoveSelections = (
  state: FileManagement,
  status: OperationStatus
) => {
  console.log("handleMoveSelections", status);
  const now = new Date().toISOString();
  const nodes = status.data as FileSystemNode[];

  nodes.forEach((node) => {
    state.nodes[node.itemId] = { ...node, fetchedAt: now, isStale: false };
    completeNodeOperation(state, { nodeId: node.itemId });
  });
};

export const handleMoveFile = (
  state: FileManagement,
  status: OperationStatus
) => {
  const now = new Date().toISOString();
  const node = status.data as FileSystemNode;
  if (state.nodes[node.itemId]) {
    delete state.nodes[node.itemId];
  }
  state.nodes[node.itemId] = {
    ...node,
    fetchedAt: now,
    isStale: false,
  };
  completeNodeOperation(state, { nodeId: node.itemId });
};

export const handleSyncNode = (
  state: FileManagement,
  status: OperationStatus
) => {
  const now = new Date().toISOString();
  const node = status.data as FileSystemNode;

  if (state.nodes[node.itemId]) {
    state.nodes[node.itemId] = {
      ...node,
      fetchedAt: now,
      contentFetchedAt: now,
      isStale: false,
    };

    // Remove the node from operation tracking
    state.nodesInOperation.delete(node.itemId);
  }
};

const completeNodeOperation = (
  state: FileManagement,
  payload: { nodeId: NodeItemId }
) => {
  const { nodeId } = payload;
  state.nodesInOperation.delete(nodeId);
  if (state.nodes[nodeId]) {
    state.nodes[nodeId].status = "idle";
    delete state.nodes[nodeId].operation;
  }
  if (state.nodesInOperation.size === 0) {
    state.currentOperation = null;
  }
};




interface DuplicateCheckResult {
  shouldUpdate: boolean;
  nodeToKeep: FileSystemNode;
  nodeToRemove?: FileSystemNode;
  requiresBackup?: boolean;
}



export function checkAndResolveDuplicates(
  state: FileManagement,
  newNode: FileSystemNode
): DuplicateCheckResult {
  // Find any existing node with the same path in the same bucket
  const existingNode = Object.values(state.nodes).find(
    node => node.bucket === newNode.bucket && 
           node.storagePath === newNode.storagePath &&
           node.itemId !== newNode.itemId
  );

  if (!existingNode) {
    return { shouldUpdate: true, nodeToKeep: newNode };
  }

  // Case 1: New node has content, existing doesn't
  if (newNode.isContentFetched && !existingNode.isContentFetched) {
    return { 
      shouldUpdate: true, 
      nodeToKeep: newNode,
      nodeToRemove: existingNode
    };
  }

  // Case 2: Existing node has content, new doesn't
  if (!newNode.isContentFetched && existingNode.isContentFetched) {
    return { 
      shouldUpdate: false, 
      nodeToKeep: existingNode,
      nodeToRemove: newNode
    };
  }

  // Case 3: Both have content - need to backup and use newer one
  if (newNode.isContentFetched && existingNode.isContentFetched) {
    const newerNode = (new Date(newNode.lastSynced || '') > new Date(existingNode.lastSynced || '')) 
      ? newNode 
      : existingNode;
    const olderNode = newerNode === newNode ? existingNode : newNode;

    return {
      shouldUpdate: newerNode === newNode,
      nodeToKeep: newerNode,
      nodeToRemove: olderNode,
      requiresBackup: true
    };
  }

  // Case 4: Neither has content - use newer one
  const newerNode = (new Date(newNode.lastSynced || '') > new Date(existingNode.lastSynced || '')) 
    ? newNode 
    : existingNode;
    
  return {
    shouldUpdate: newerNode === newNode,
    nodeToKeep: newerNode,
    nodeToRemove: newerNode === newNode ? existingNode : newNode
  };
}
