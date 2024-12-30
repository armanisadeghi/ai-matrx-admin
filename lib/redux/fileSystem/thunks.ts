import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  FILE_SYSTEM_ACTION_PREFIX,
  FileManagement,
  NodeItemId,
  FileSystemNode,
  StorageMetadata,
  AvailableBuckets,
  FileOperation,
  ListOptions,
  BatchOperationOptions,
  DownloadOptions,
  MoveOptions,
  SyncOptions,
  UploadOptions,
  CreateFileOptions,
} from "./types";
import { AppDispatch, RootState } from "../store";
import {
  createNodeFromStorageItem,
  createOptimisticRenameUpdate,
  getCachedNodes,
  getNewPath,
  processNodes,
  shouldFetchContent,
} from "./fileSystemUtils";
import {
  copyStorageItem,
  fetchStorageContents,
  moveOrRenameFile,
  moveOrRenameFolder,
} from "./api";

import { supabaseStandard, supabaseDebug } from "@/utils/supabase/debugClient";
import {
  getFileSystemDetails,
  getFileSystemDetailsWithSelection,
  isFreshData,
} from "./thunkHelpers";
import { createFileSystemSlice } from "./slice";

const debug = true;
const supabase = debug ? supabaseDebug : supabaseStandard;

const createOperationThunk = <TArgs, TResult>(
  bucketName: AvailableBuckets,
  operationName: FileOperation,
  operation: (
    args: TArgs,
    helpers: { getState: () => RootState; dispatch: AppDispatch } // Add dispatch here
  ) => Promise<TResult>,
  preOperation: (
    args: TArgs,
    helpers: { dispatch: AppDispatch; getState: () => RootState }
  ) => void = defaultPreOperation,
  postOperation: (
    result: TResult,
    args: TArgs,
    helpers: { dispatch: AppDispatch; getState: () => RootState }
  ) => void = defaultPostOperation
) => {
  return createAsyncThunk<
    TResult,
    TArgs,
    { state: RootState; dispatch: AppDispatch; rejectValue: string }
  >(
    `${FILE_SYSTEM_ACTION_PREFIX}/${bucketName}/${operationName}`,
    async (args, { dispatch, getState }) => {
      try {
        preOperation(args, { dispatch, getState });

        dispatch({
          type: `fileSystem/${bucketName}/setOperationStatus`,
          payload: {
            type: operationName,
            status: { isLoading: true },
          },
        });

        const result = await operation(args, { dispatch, getState }); // Pass dispatch here

        postOperation(result, args, { dispatch, getState });

        dispatch({
          type: `fileSystem/${bucketName}/setOperationStatus`,
          payload: {
            type: operationName,
            status: { isLoading: false, data: result },
          },
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        dispatch({
          type: `fileSystem/${bucketName}/setOperationStatus`,
          payload: {
            type: operationName,
            status: { isLoading: false, error: errorMessage },
          },
        });
        throw error;
      }
    }
  );
};

export const defaultPreOperation = <TArgs>(
  args: TArgs,
  { dispatch, getState }: { dispatch: any; getState: () => RootState }
) => {};

export const defaultPostOperation = <TResult, TArgs>(
  result: TResult,
  args: TArgs,
  { dispatch, getState }: { dispatch: any; getState: () => RootState }
) => {};

const listContentsOperation = async (
  bucketName: AvailableBuckets,
  options: ListOptions,
  { getState }: { getState: () => RootState }
): Promise<FileSystemNode[]> => {
  const { state, activeNode, parentId, parentPath, storagePath } =
    getFileSystemDetails(bucketName, getState);

  const isFresh =
    activeNode &&
    isFreshData(
      activeNode.childrenFetchedAt,
      state.staleDuration,
      activeNode.isStale
    );

  if (activeNode && !options.forceFetch && isFresh) {
    const existingChildren = Object.values(state.nodes).filter(
      (node) => node.parentId === activeNode.itemId
    );
    return processNodes(existingChildren, options);
  }

  const data = await fetchStorageContents(bucketName, storagePath, options);

  const nodes = data.map((storageItem) =>
    createNodeFromStorageItem(bucketName, storageItem, parentId, parentPath)
  );

  return processNodes(nodes, options);
};

const renameActiveNode = async (
  bucketName: AvailableBuckets,
  newName: string,
  { getState, dispatch }: { getState: () => RootState; dispatch: AppDispatch }
): Promise<FileSystemNode[]> => {
  const { state, activeNode, parentId, parentPath } = getFileSystemDetails(
    bucketName,
    getState
  );
  if (!activeNode) throw new Error("No active node");

  const { actions } = createFileSystemSlice(bucketName);

  // Create optimistic update
  const newPath = getNewPath(activeNode.storagePath, newName);
  const updatedNode = {
    ...activeNode,
    name: newName,
    storagePath: newPath,
    lastSynced: new Date().toISOString(),
    isStale: false,
    isDirty: false,
  };

  try {
    // Apply optimistic update immediately
    dispatch(
      actions.updateNode({
        nodeId: activeNode.itemId,
        updates: updatedNode,
      })
    );

    // Call appropriate API based on node type
    if (activeNode.contentType === "FOLDER") {
      const folderData = await moveOrRenameFolder(
        bucketName,
        activeNode.storagePath,
        newPath
      );

      const processedNodes = folderData.map((storageItem) =>
        createNodeFromStorageItem(bucketName, storageItem, parentId, parentPath)
      );

      // Now dispatch with the properly processed nodes
      dispatch({
        type: `fileSystem/${bucketName}/setOperationStatus`,
        payload: {
          type: "listContents",
          status: {
            isLoading: false,
            data: processedNodes, // Now using processed nodes
          },
        },
      });
    } else {
      await moveOrRenameFile(bucketName, activeNode.storagePath, newPath);
    }

    return [updatedNode];
  } catch (error) {
    // On error, revert to original state
    dispatch(
      actions.updateNode({
        nodeId: activeNode.itemId,
        updates: activeNode,
      })
    );
    throw error;
  }
};

const duplicateSelections = async (
  bucketName: AvailableBuckets,
  newPath: string,
  { getState }: { getState: () => RootState }
): Promise<FileSystemNode[]> => {
  const {
    state,
    selectedNodes,
    parentId,
    parentPath,
    storagePath,
    cachedNodes,
  } = getFileSystemDetailsWithSelection(bucketName, getState);

  if (!selectedNodes || selectedNodes.length === 0) {
    throw new Error("No selected nodes to duplicate.");
  }

  const allUpdatedNodes: FileSystemNode[] = [];

  for (const node of selectedNodes) {
    const oldPath = node.storagePath;
    const updatedStorageItemData = await copyStorageItem(
      bucketName,
      oldPath,
      newPath
    );
    const updatedNode = createNodeFromStorageItem(
      bucketName,
      updatedStorageItemData,
      parentId,
      parentPath
    );
    allUpdatedNodes.push(updatedNode);
  }

  const options = {};
  return processNodes(allUpdatedNodes, options);
};

const moveSelections = async (
  bucketName: AvailableBuckets,
  newPath: string,
  { getState, dispatch }: { getState: () => RootState; dispatch: AppDispatch }
): Promise<FileSystemNode[]> => {
  const { state, selectedNodes, parentId, parentPath } =
    getFileSystemDetailsWithSelection(bucketName, getState);

  if (!selectedNodes || selectedNodes.length === 0) {
    throw new Error("No selected nodes to move.");
  }

  const { actions } = createFileSystemSlice(bucketName);
  const allUpdatedNodes: FileSystemNode[] = [];
  const originalNodes = [...selectedNodes]; // Keep for potential rollback

  try {
    // Create and apply optimistic updates for all selected nodes
    const optimisticUpdates = selectedNodes.map((node) => ({
      ...node,
      storagePath: `${newPath}/${node.name}`,
      lastSynced: new Date().toISOString(),
      isStale: false,
      isDirty: false,
    }));

    // Apply optimistic updates
    optimisticUpdates.forEach((updatedNode) => {
      dispatch(
        actions.updateNode({
          nodeId: updatedNode.itemId,
          updates: updatedNode,
        })
      );
    });

    // Process each node
    for (const node of selectedNodes) {
      const oldPath = node.storagePath;
      const nodeNewPath = `${newPath}/${node.name}`;

      if (node.contentType === "FOLDER") {
        const folderData = await moveOrRenameFolder(
          bucketName,
          oldPath,
          nodeNewPath
        );

        const processedNodes = folderData.map((storageItem) =>
          createNodeFromStorageItem(
            bucketName,
            storageItem,
            parentId,
            parentPath
          )
        );

        dispatch({
          type: `fileSystem/${bucketName}/setOperationStatus`,
          payload: {
            type: "listContents",
            status: {
              isLoading: false,
              data: processedNodes,
            },
          },
        });

        allUpdatedNodes.push({
          ...node,
          storagePath: nodeNewPath,
          lastSynced: new Date().toISOString(),
          isStale: false,
          isDirty: false,
        });
      } else {
        // Move file
        await moveOrRenameFile(bucketName, oldPath, nodeNewPath);
        allUpdatedNodes.push({
          ...node,
          storagePath: nodeNewPath,
          lastSynced: new Date().toISOString(),
          isStale: false,
          isDirty: false,
        });
      }
    }

    return processNodes(allUpdatedNodes, {});
  } catch (error) {
    // Revert all optimistic updates on error
    originalNodes.forEach((originalNode) => {
      dispatch(
        actions.updateNode({
          nodeId: originalNode.itemId,
          updates: originalNode,
        })
      );
    });
    throw error;
  }
};

const downloadFileOperation = async (
  bucketName: AvailableBuckets,
  { forceFetch = false, preferCache = true }: DownloadOptions,
  { getState }: { getState: () => RootState }
): Promise<{ nodeId: NodeItemId; blob: Blob; metadata: StorageMetadata }> => {
  const state = getState().fileSystem[bucketName];
  if (!state.activeNode) throw new Error("No active node");
  const node = state.nodes[state.activeNode];

  if (
    !forceFetch &&
    preferCache &&
    node?.content &&
    !shouldFetchContent(node)
  ) {
    return {
      nodeId: node.itemId,
      blob: node.content.blob,
      metadata: node.metadata!,
    };
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(node.storagePath);

  if (error) throw error;
  if (!data) throw new Error("No data received");

  return {
    nodeId: node.itemId,
    blob: data,
    metadata: node.metadata!,
  };
};

const uploadFileOperation = async (
  bucketName: AvailableBuckets,
  { file, options = {} }: { file: File; options?: UploadOptions },
  { getState }: { getState: () => RootState }
): Promise<FileSystemNode> => {
  const { state, activeNode, parentId, parentPath, storagePath, cachedNodes } =
    getFileSystemDetails(bucketName, getState);

  const uploadPath = `${parentPath}/${file.name}`.replace(/^\/+/, "");

  const uploadOptions: any = {
    upsert: options.overwrite || false,
    contentType: options.contentType || file.type,
    cacheControl: options.cacheControl,
  };

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(uploadPath, file, uploadOptions);

  if (error) throw error;
  if (!data) throw new Error("No data received");

  const storageItem = {
    name: file.name,
    id: data.path,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
    metadata: {
      mimetype: options.contentType || file.type,
      size: file.size,
      contentLength: file.size,
      lastModified: new Date().toISOString(),
    },
  };

  return createNodeFromStorageItem(
    bucketName,
    storageItem,
    parentId,
    parentPath,
    {
      blob: file,
      isDirty: false,
    }
  );
};

const deleteActiveNode = async (
  bucketName: AvailableBuckets,
  { getState }: { getState: () => RootState }
): Promise<NodeItemId> => {
  const { activeNode } = getFileSystemDetails(bucketName, getState);
  if (!activeNode) throw new Error("No active node");

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([activeNode.storagePath]);

  if (error) throw error;

  return activeNode.itemId;
};

const deleteFilesOperation = async (
  bucketName: AvailableBuckets,
  options: BatchOperationOptions | undefined,
  { getState }: { getState: () => RootState }
): Promise<NodeItemId[]> => {
  const state = getState().fileSystem[bucketName];
  const selectedNodes = Array.from(state.selection.selectedNodes)
    .map((id) => state.nodes[id])
    .filter(Boolean);

  if (selectedNodes.length === 0) throw new Error("No nodes selected");

  const deletedIds: NodeItemId[] = [];
  const paths = selectedNodes.map((node) => node.storagePath);

  if (options?.parallel) {
    const batchSize = options.batchSize || 10;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const batchNodes = selectedNodes.slice(i, i + batchSize);

      try {
        const { error } = await supabase.storage.from(bucketName).remove(batch);
        if (error && !options.continueOnError) throw error;
        deletedIds.push(...batchNodes.map((n) => n.itemId));
      } catch (error) {
        if (!options.continueOnError) throw error;
      }
    }
  } else {
    const { error } = await supabase.storage.from(bucketName).remove(paths);
    if (error) throw error;
    deletedIds.push(...selectedNodes.map((n) => n.itemId));
  }

  return deletedIds;
};

const moveFilesOperation = async (
  bucketName: AvailableBuckets,
  {
    destinationNodeId,
    options = {},
  }: { destinationNodeId: NodeItemId; options?: MoveOptions },
  { getState }: { getState: () => RootState }
): Promise<FileSystemNode[]> => {
  const state = getState().fileSystem[bucketName];
  const destinationNode = state.nodes[destinationNodeId];
  const selectedNodes = Array.from(state.selection.selectedNodes)
    .map((id) => state.nodes[id])
    .filter(Boolean);

  if (selectedNodes.length === 0) throw new Error("No nodes selected");
  if (!destinationNode) throw new Error("Destination node not found");

  const movedNodes: FileSystemNode[] = [];
  const batchOptions = options.batch || {};

  const processBatch = async (nodes: FileSystemNode[]) => {
    const results: FileSystemNode[] = [];
    for (const node of nodes) {
      const newPath = `${destinationNode.storagePath}/${node.name}`;

      try {
        const { error } = await supabase.storage
          .from(bucketName)
          .move(node.storagePath, newPath);

        if (error && !batchOptions.continueOnError) throw error;

        const now = new Date().toISOString();
        results.push({
          ...node,
          storagePath: newPath,
          parentId: destinationNode.itemId,
          isDirty: false,
          lastSynced: now,
          fetchedAt: now,
        });
      } catch (error) {
        if (!batchOptions.continueOnError) throw error;
      }
    }
    return results;
  };

  if (batchOptions.parallel) {
    const batchSize = batchOptions.batchSize || 5;
    for (let i = 0; i < selectedNodes.length; i += batchSize) {
      const batch = selectedNodes.slice(i, i + batchSize);
      const results = await processBatch(batch);
      movedNodes.push(...results);
    }
  } else {
    movedNodes.push(...(await processBatch(selectedNodes)));
  }

  return movedNodes;
};

const syncNodeOperation = async (
  bucketName: AvailableBuckets,
  { nodeId, options = {} }: { nodeId: NodeItemId; options?: SyncOptions },
  { getState }: { getState: () => RootState }
): Promise<FileSystemNode> => {
  const state = getState().fileSystem[bucketName];
  const node = state.nodes[nodeId];

  if (!node) throw new Error("Node not found");

  if (!options.forceFetch && !node.isDirty && !node.isStale) {
    return node;
  }

  if (node.contentType === "FILE" && (options.syncContent || node.isDirty)) {
    if (node.isDirty && node.content?.blob) {
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(node.storagePath, node.content.blob, { upsert: true });

      if (uploadError) throw uploadError;
    } else {
      const { data: content, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(node.storagePath);

      if (downloadError) throw downloadError;
      if (content) {
        node.content = { blob: content, isDirty: false };
      }
    }

    if (options.validateContent) {
      const { data: validationData, error: validationError } =
        await supabase.storage.from(bucketName).download(node.storagePath);

      if (validationError) throw validationError;
      if (!validationData) {
        throw new Error("Failed to validate content");
      }
    }
  }

  const now = new Date().toISOString();
  return {
    ...node,
    isDirty: false,
    isStale: false,
    lastSynced: now,
    fetchedAt: now,
    metadata: {
      ...node.metadata,
      lastModified: now,
    },
  };
};

const createFileOperation = async (
  bucketName: AvailableBuckets,
  {
    name,
    content,
    parentId = null,
    metadata = {},
    ...options
  }: CreateFileOptions,
  { getState }: { getState: () => RootState }
): Promise<FileSystemNode> => {
  const { state, activeNode, parentPath, storagePath, cachedNodes } =
    getFileSystemDetails(bucketName, getState); //TODO: Make it work with activeNode

  const file = content instanceof File ? content : new File([content], name);
  const uploadPath = `${parentPath}/${name}`.replace(/^\/+/, "");

  const uploadOptions: any = {
    upsert: options.overwrite || false,
    contentType: options.contentType || file.type,
    cacheControl: options.cacheControl,
  };

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(uploadPath, file, uploadOptions);

  if (error) throw error;
  if (!data) throw new Error("No data received from upload");

  const storageItem = {
    name,
    id: data.path,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
    metadata: {
      ...metadata,
      mimetype: options.contentType || file.type,
      size: file.size,
      contentLength: file.size,
      lastModified: new Date().toISOString(),
    },
  };

  return createNodeFromStorageItem(
    bucketName,
    storageItem,
    parentId,
    parentPath,
    {
      blob: file,
      isDirty: false,
    }
  );
};

const createFolderOperation = async (
  bucketName: AvailableBuckets,
  { name, parentId = null }: { name: string; parentId?: NodeItemId | null },
  { getState }: { getState: () => RootState }
): Promise<FileSystemNode> => {
  const { state, parentPath } = getFileSystemDetails(bucketName, getState);

  // Create the folder path and placeholder file path
  const folderPath = `${parentPath}/${name}`.replace(/^\/+/, "");
  const placeholderPath = `${folderPath}/.emptyFolderPlaceholder`;

  // Create an empty file as placeholder
  const emptyFile = new File([""], ".emptyFolderPlaceholder");

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(placeholderPath, emptyFile, {
      upsert: true,
      contentType: "application/x-empty",
    });

  if (error) throw error;
  if (!data) throw new Error("No data received from folder creation");

  // Create a storage item for the folder itself
  const folderStorageItem = {
    name,
    id: folderPath,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
    metadata: {
      mimetype: "folder",
      size: 0,
      contentLength: 0,
      lastModified: new Date().toISOString(),
    },
  };

  return createNodeFromStorageItem(
    bucketName,
    folderStorageItem,
    parentId,
    parentPath,
  );
};

const getPublicUrlOperation = async (
  bucketName: AvailableBuckets,
  { nodeId, expiresIn }: { nodeId: NodeItemId; expiresIn?: number },
  { getState }: { getState: () => RootState }
): Promise<{ nodeId: NodeItemId; url: string; isPublic: boolean }> => {
  const state = getState().fileSystem[bucketName];
  const node = state.nodes[nodeId];

  if (!node) throw new Error("Node not found");
  if (node.contentType !== "FILE") throw new Error("Node is not a file");

  const { data: publicData } = await supabase.storage
    .from(bucketName)
    .getPublicUrl(node.storagePath);

  if (publicData?.publicUrl) {
    return {
      nodeId,
      url: publicData.publicUrl,
      isPublic: true,
    };
  }

  const { data: signedData, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(node.storagePath, expiresIn || 3600);

  if (error) throw error;
  if (!signedData) throw new Error("Failed to create URL");

  return {
    nodeId,
    url: signedData.signedUrl,
    isPublic: false,
  };
};

export const createFileSystemOperations = (bucketName: AvailableBuckets) => ({
  listContents: createOperationThunk<ListOptions, FileSystemNode[]>(
    bucketName,
    "listContents",
    (options, helpers) => listContentsOperation(bucketName, options, helpers)
  ),
  downloadFile: createOperationThunk<
    { forceFetch?: boolean; preferCache?: boolean },
    { nodeId: NodeItemId; blob: Blob; metadata: StorageMetadata }
  >(bucketName, "downloadFile", (options, helpers) =>
    downloadFileOperation(bucketName, options, helpers)
  ),
  uploadFile: createOperationThunk<
    { file: File; options?: UploadOptions },
    FileSystemNode
  >(bucketName, "uploadFile", (options, helpers) =>
    uploadFileOperation(bucketName, options, helpers)
  ),
  deleteFiles: createOperationThunk<
    BatchOperationOptions | undefined,
    NodeItemId[]
  >(bucketName, "deleteFile", (options, helpers) =>
    deleteFilesOperation(bucketName, options, helpers)
  ),
  moveFiles: createOperationThunk<
    { destinationNodeId: NodeItemId; options?: MoveOptions },
    FileSystemNode[]
  >(bucketName, "moveFile", (options, helpers) =>
    moveFilesOperation(bucketName, options, helpers)
  ),
  syncNode: createOperationThunk<
    { nodeId: NodeItemId; options?: SyncOptions },
    FileSystemNode
  >(bucketName, "syncNode", (options, helpers) =>
    syncNodeOperation(bucketName, options, helpers)
  ),
  createFile: createOperationThunk<CreateFileOptions, FileSystemNode>(
    bucketName,
    "createFile",
    (options, helpers) => createFileOperation(bucketName, options, helpers)
  ),

  createFolder: createOperationThunk<
    { name: string; parentId?: NodeItemId | null },
    FileSystemNode
  >(bucketName, "createFolder", (options, helpers) =>
    createFolderOperation(bucketName, options, helpers)
  ),

  getPublicFile: createOperationThunk<
    { nodeId: NodeItemId; expiresIn?: number },
    { nodeId: NodeItemId; url: string; isPublic: boolean }
  >(bucketName, "getPublicFile", (options, helpers) =>
    getPublicUrlOperation(bucketName, options, helpers)
  ),

  // New Thunks
  renameActiveNode: createOperationThunk<{ newName: string }, FileSystemNode[]>(
    bucketName,
    "renameActiveNode",
    (options, helpers) => renameActiveNode(bucketName, options.newName, helpers)
  ),
  duplicateSelections: createOperationThunk<
    { newPath: string },
    FileSystemNode[]
  >(bucketName, "duplicateSelections", (options, helpers) =>
    duplicateSelections(bucketName, options.newPath, helpers)
  ),
  moveSelections: createOperationThunk<{ newPath: string }, FileSystemNode[]>(
    bucketName,
    "moveSelections",
    (options, helpers) => moveSelections(bucketName, options.newPath, helpers)
  ),

  deleteActiveNode: createOperationThunk<void, NodeItemId>(
    bucketName,
    "deleteActiveNode",
    (_, helpers) => deleteActiveNode(bucketName, helpers)
  ),
});
