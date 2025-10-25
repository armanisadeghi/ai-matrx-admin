// lib/redux/fileSystem/hooks.ts
import { useEffect, useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { createFileSystemSelectors } from "./selectors";
import { createFileSystemSlice } from "./slice";
import {
  NodeItemId,
  FileSystemNode,
  FileOperation,
  FileSystemActionTypes ,
  ThunkConfig,
  StorageMetadata,
  AvailableBuckets,
  DownloadOptions,
  UploadOptions,
  SyncOptions,
  BatchOperationOptions,
  CreateFileOptions,
  MoveOptions,
  ListOptions,
} from "./types";



export const createFileSystemHooks = (bucketName: AvailableBuckets) => {
  const slice = createFileSystemSlice(bucketName);
  const selectors = createFileSystemSelectors(bucketName);
  const { actions } = slice;


  const useTreeTraversal = () => {
    const dispatch = useAppDispatch();
    
    const activeNode = useAppSelector(selectors.selectActiveNode);
    const activeNodeChildren = useAppSelector(selectors.selectActiveNodeChildren);
    const isActiveNodeFolder = useAppSelector(selectors.selectIsActiveNodeFolder);
    
    console.log('Tree Traversal State:', {
      activeNode: activeNode?.name,
      activeNodeId: activeNode?.itemId,
      childrenCount: activeNodeChildren?.length,
      children: activeNodeChildren?.map(n => n.name),
      isFolder: isActiveNodeFolder
    });
  
  
    // Navigation actions
    const navigateToNode = useCallback((nodeId: NodeItemId | null) => {
      console.log('Navigating to:', nodeId);
      if (nodeId) {
        dispatch(actions.selectNode({
          nodeId,
          isMultiSelect: false,
          isRangeSelect: false
        }));
      } else {
        dispatch(actions.clearSelection());
      }
      console.log('Dispatching listContents');
      dispatch(actions.listContents({}));
    }, [dispatch]);
    
    const navigateToParent = useCallback(() => {
      if (activeNode?.parentId) {
        navigateToNode(activeNode.parentId);
      } else {
        // If no parent, navigate to root
        navigateToNode(null);
      }
    }, [activeNode, navigateToNode]);
  
    const navigateToRoot = useCallback(() => {
      navigateToNode(null);
    }, [navigateToNode]);
  
    // Navigation state helpers
    const canNavigateUp = activeNode !== null;
    const canNavigateInto = isActiveNodeFolder;
  
    console.log("Current State:",
      activeNode?.name,
      activeNode?.parentId,
      activeNode?.contentType,
      activeNodeChildren.length
    )

    return {
      // Current state
      activeNode,
      activeNodeChildren,
      isActiveNodeFolder,
      
      // Navigation actions
      navigateToNode,
      navigateToParent,
      navigateToRoot,
      
      // Navigation state
      canNavigateUp,
      canNavigateInto,
    };
  };  

  const useSelection = () => {
    const dispatch = useAppDispatch();
    
    // Selection state
    const selection = useAppSelector(selectors.selectSelection);
    const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
    const selectedNodeIds = useAppSelector(selectors.selectSelectedNodeIds);
    const hasSelection = useAppSelector(selectors.selectHasSelection);
    const isMultiSelect = useAppSelector(selectors.selectIsMultiSelect);
    const selectedFileNodes = useAppSelector(selectors.selectSelectedFileNodes);
    const selectedFolderNodes = useAppSelector(selectors.selectSelectedFolderNodes);
    
    // Multi-select mode state
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
    // Auto-enable multi-select mode when multiple items are selected
    useEffect(() => {
      if (selectedNodes.length > 1 && !isMultiSelectMode) {
        setIsMultiSelectMode(true);
      }
    }, [selectedNodes.length, isMultiSelectMode]);
  
    // Core selection actions
    const selectNode = useCallback((
      nodeId: NodeItemId, 
      event?: React.MouseEvent | KeyboardEvent
    ) => {
      dispatch(actions.selectNode({
        nodeId,
        isMultiSelect: isMultiSelectMode || event?.ctrlKey || event?.metaKey,
        isRangeSelect: false // Range select handled separately
      }));
    }, [dispatch, isMultiSelectMode]);
  
    const toggleSelection = useCallback((nodeId: NodeItemId) => {
      dispatch(actions.selectNode({
        nodeId,
        isMultiSelect: true,
        isRangeSelect: false
      }));
    }, [dispatch]);
  
    const clearSelection = useCallback(() => {
      setIsMultiSelectMode(false);
      dispatch(actions.clearSelection());
    }, [dispatch]);
  
    // Multi-select mode controls
    const enterMultiSelectMode = useCallback(() => {
      setIsMultiSelectMode(true);
    }, []);
  
    const exitMultiSelectMode = useCallback(() => {
      setIsMultiSelectMode(false);
      // Keep only the last selected item when exiting multi-select
      if (selectedNodes.length > 1) {
        const lastNode = selectedNodes[selectedNodes.length - 1];
        clearSelection();
        if (lastNode) {
          selectNode(lastNode.itemId);
        }
      }
    }, [selectedNodes, clearSelection, selectNode]);
  
    // Selection utilities
    const isSelected = useCallback((nodeId: NodeItemId) => 
      selection.selectedNodes.has(nodeId),
    [selection.selectedNodes]);
  
    const getSelectionType = useCallback(() => {
      if (selectedNodes.length === 0) return 'none';
      if (selectedFileNodes.length > 0 && selectedFolderNodes.length > 0) return 'mixed';
      if (selectedFileNodes.length > 0) return 'files';
      return 'folders';
    }, [selectedNodes.length, selectedFileNodes.length, selectedFolderNodes.length]);
  
    return {
      // Selection state
      selectedNodes,
      selectedNodeIds,
      selectedFileNodes,
      selectedFolderNodes,
      hasSelection,
      isMultiSelect,
      isMultiSelectMode,
      
      // Core actions
      selectNode,
      toggleSelection,
      clearSelection,
      
      // Multi-select mode controls
      enterMultiSelectMode,
      exitMultiSelectMode,
      
      // Utilities
      isSelected,
      getSelectionType,
      
      // Selection count helpers
      totalSelected: selectedNodes.length,
      filesSelected: selectedFileNodes.length,
      foldersSelected: selectedFolderNodes.length,
    };
  };

  const useRangeSelection = () => {
    const dispatch = useAppDispatch();
    const selection = useAppSelector(selectors.selectSelection);
    
    const selectRange = useCallback((
      nodeId: NodeItemId,
      anchorId: NodeItemId = selection.selectionAnchor
    ) => {
      if (!anchorId) return;
      
      dispatch(actions.selectNode({
        nodeId,
        isMultiSelect: false,
        isRangeSelect: true
      }));
    }, [dispatch, selection.selectionAnchor]);
  
    const setSelectionAnchor = useCallback((nodeId: NodeItemId) => {
      dispatch(actions.selectNode({
        nodeId,
        isMultiSelect: false,
        isRangeSelect: false
      }));
    }, [dispatch]);
  
    return {
      selectRange,
      setSelectionAnchor,
      selectionAnchor: selection.selectionAnchor,
      lastSelected: selection.lastSelected
    };
  };

  const useOperationLock = () => {
    const dispatch = useAppDispatch();
    const isLocked = useAppSelector(selectors.selectOperationLock);
    const currentOperation = useAppSelector(selectors.selectCurrentOperation);
    const activeNode = useAppSelector(selectors.selectActiveNode);
    const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
  
    const acquireLock = useCallback(
      (operation: FileOperation, nodeIds: NodeItemId[]) => {
        if (!isLocked) {
          dispatch(actions.acquireOperationLock({ operation, nodeIds }));
          return true;
        }
        return false;
      },
      [dispatch, isLocked]
    );
  
    const acquireLockForActive = useCallback(
      (operation: FileOperation) => {
        if (activeNode) {
          return acquireLock(operation, [activeNode.itemId]);
        }
        return false;
      },
      [acquireLock, activeNode]
    );
  
    const acquireLockForSelected = useCallback(
      (operation: FileOperation) => {
        if (selectedNodes.length > 0) {
          return acquireLock(
            operation,
            selectedNodes.map(node => node.itemId)
          );
        }
        return false;
      },
      [acquireLock, selectedNodes]
    );
  
    const releaseLock = useCallback(() => {
      dispatch(actions.releaseOperationLock());
    }, [dispatch]);
  
    return {
      isLocked,
      currentOperation,
      acquireLock,
      acquireLockForActive,
      acquireLockForSelected,
      releaseLock
    };
  };

  const useNodeOps = (nodeId: NodeItemId) => {
    const dispatch = useAppDispatch();
    const node = useAppSelector(selectors.selectNode(nodeId));
    const isFolder = useAppSelector(selectors.selectIsNodeFolder(nodeId));
    const { acquireLock, releaseLock } = useOperationLock();
  
    // Node type-specific selectors
    const extension = useAppSelector(selectors.selectNodeExtension(nodeId));
    const mimeType = useAppSelector(selectors.selectNodeMimeType(nodeId));
    const size = useAppSelector(selectors.selectNodeSize(nodeId));
    
    // Content management
    const fetchContent = useCallback(async (options: DownloadOptions = {}) => {
      if (!node || isFolder) return;
      
      if (acquireLock('downloadFile', [nodeId])) {
        try {
          const result = await dispatch(actions.downloadFile(options)).unwrap();
          return result;
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, node, isFolder, nodeId, acquireLock, releaseLock]);
  
    const updateContent = useCallback(async (
      content: File | Blob,
      options: UploadOptions = {}
    ) => {
      if (!node || isFolder) return;
      
      if (acquireLock('uploadFile', [nodeId])) {
        try {
          const file = content instanceof File ? content : new File([content], node.name);
          const result = await dispatch(actions.uploadFile({
            file,
            options: {
              overwrite: true,
              ...options
            }
          })).unwrap();
          return result;
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, node, isFolder, nodeId, acquireLock, releaseLock]);
  
    // Node synchronization
    const syncNode = useCallback(async (options: SyncOptions = {}) => {
      if (!node) return;
      
      if (acquireLock('syncNode', [nodeId])) {
        try {
          const result = await dispatch(actions.syncNode({
            nodeId,
            options
          })).unwrap();
          return result;
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, node, nodeId, acquireLock, releaseLock]);
  
    const [publicUrlInfo, setPublicUrlInfo] = useState<{
      url: string;
      isPublic: boolean;
      expiresAt?: Date;
    } | null>(null);
  
    const getPublicUrl = useCallback(async (options?: { expiresIn?: number }) => {
      if (!node || isFolder) return null;
      
      if (acquireLock('getPublicFile', [nodeId])) {
        try {
          const result = await dispatch(actions.getPublicFile({
            nodeId,
            expiresIn: options?.expiresIn
          })).unwrap();
  
          const urlInfo = {
            url: result.url,
            isPublic: result.isPublic,
            expiresAt: result.isPublic ? undefined : 
              new Date(Date.now() + (options?.expiresIn || 3600) * 1000)
          };
  
          setPublicUrlInfo(urlInfo);
          return urlInfo;
        } finally {
          releaseLock();
        }
      }
      return null;
    }, [dispatch, node, isFolder, nodeId, acquireLock, releaseLock]);
  
    // Clear expired URL info
    useEffect(() => {
      if (publicUrlInfo?.expiresAt && Date.now() > publicUrlInfo.expiresAt.getTime()) {
        setPublicUrlInfo(null);
      }
    }, [publicUrlInfo]);

    return {
      // Node data
      node,
      isFolder,
      
      // Basic metadata
      name: node?.name,
      path: node?.storagePath,
      parentId: node?.parentId,
      
      // File-specific metadata
      extension,
      mimeType,
      size,
      
      // Content
      content: node?.content,

      publicUrlInfo,
      getPublicUrl,
      isPublic: publicUrlInfo?.isPublic ?? false,
      hasValidUrl: publicUrlInfo !== null && 
        (!publicUrlInfo.expiresAt || Date.now() < publicUrlInfo.expiresAt.getTime()),
  
      // Operations
      fetchContent,
      updateContent,
      syncNode,
      
      // Status
      exists: !!node,
      isContentLoaded: node?.isContentFetched ?? false,
      isStale: node?.isStale ?? true,
      isDirty: node?.isDirty ?? false,
      lastFetched: node?.fetchedAt,
      lastContentFetched: node?.contentFetchedAt,
      lastSynced: node?.lastSynced,
      
      // Operation status
      status: node?.status,
      operation: node?.operation,
      
      // Timestamps
      createdAt: node?.metadata?.created_at,
      lastModified: node?.metadata?.lastModified,
    };
  };

  const useFileOperations = () => {
    const dispatch = useAppDispatch();
    const { acquireLockForSelected, acquireLock, releaseLock } = useOperationLock();
    const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
    const activeNode = useAppSelector(selectors.selectActiveNode);
  
    // Single file operations
    const renameNode = useCallback(async (
      nodeId: NodeItemId, 
      newName: string,
      options: UploadOptions = {}
    ) => {
      if (acquireLock('moveFile', [nodeId])) {
        try {
          const node = selectedNodes.find(n => n.itemId === nodeId);
          if (!node) throw new Error('Node not found');
  
          const parentPath = node.storagePath.split('/').slice(0, -1).join('/');
          const newPath = `${parentPath}/${newName}`;
  
          await dispatch(actions.moveFiles({
            destinationNodeId: node.parentId || '',
            options: {
              ...options,
              overwrite: options.overwrite ?? false
            }
          })).unwrap();
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, acquireLock, releaseLock, selectedNodes]);
  
    // Batch operations
    const moveNodes = useCallback(async (
      destinationNodeId: NodeItemId,
      options: MoveOptions = {}
    ) => {
      if (acquireLockForSelected('moveFile')) {
        try {
          const result = await dispatch(actions.moveFiles({
            destinationNodeId,
            options
          })).unwrap();
          return result;
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, acquireLockForSelected, releaseLock]);
  
    const deleteNodes = useCallback(async (
      options: BatchOperationOptions = {}
    ) => {
      if (acquireLockForSelected('deleteFile')) {
        try {
          const result = await dispatch(actions.deleteFiles(options)).unwrap();
          return result;
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, acquireLockForSelected, releaseLock]);
  
    // File creation
    const createFile = useCallback(async (
      options: CreateFileOptions
    ) => {
      const parentId = options.parentId || activeNode?.itemId || null;
      
      if (acquireLock('createFile', [parentId || ''])) {
        try {
          const result = await dispatch(actions.createFile({
            ...options,
            parentId
          })).unwrap();
          return result;
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, acquireLock, releaseLock, activeNode]);
  
    // Utility operations
    const copyNodes = useCallback(async (
      destinationNodeId: NodeItemId,
      options: BatchOperationOptions = {}
    ) => {
      if (acquireLockForSelected('uploadFile')) {
        try {
          const results: FileSystemNode[] = [];
          
          for (const node of selectedNodes) {
            if (node.contentType === 'FILE' && node.content?.blob) {
              const result = await dispatch(actions.createFile({
                name: node.name,
                content: node.content.blob,
                parentId: destinationNodeId,
                overwrite: options.forceFetch,
                preserveMetadata: true
              })).unwrap();
              
              results.push(result);
            }
          }
          
          return results;
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, acquireLockForSelected, releaseLock, selectedNodes]);
  
    // Status helpers
    const canDelete = selectedNodes.length > 0;
    const canMove = selectedNodes.length > 0;
    const canCopy = selectedNodes.some(n => n.contentType === 'FILE');
    const canRename = selectedNodes.length === 1;
  
    return {
      // Core operations
      renameNode,
      moveNodes,
      deleteNodes,
      createFile,
      copyNodes,
  
      // Batch operation helpers
      selectedCount: selectedNodes.length,
      selectedNodes,
      
      // Operation availability
      canDelete,
      canMove,
      canCopy,
      canRename,
      
      // Active context
      activeNode,
      
      // Additional helpers
      isProcessingBatch: selectedNodes.length > 1,
    };
  };

  const useFolderContents = (nodeId: NodeItemId | null = null) => {
    const dispatch = useAppDispatch();
    const children = useAppSelector(selectors.selectNodeChildren(nodeId));
    const isStale = nodeId ? 
      useAppSelector(selectors.selectNode(nodeId))?.isStale : false;
    const isLoading = useAppSelector(selectors.selectIsLoading);
    const { acquireLock, releaseLock } = useOperationLock();
  
    const refreshContents = useCallback(async (forceFetch: boolean = false) => {
      if ((isStale || forceFetch) && !isLoading && 
          acquireLock('listContents', nodeId ? [nodeId] : [])) {
        try {
          await dispatch(actions.listContents({
            forceFetch,
            filter: undefined // Can be extended with filter options
          })).unwrap();
        } finally {
          releaseLock();
        }
      }
    }, [isStale, isLoading, nodeId, dispatch, acquireLock, releaseLock]);
  
    // Auto-refresh stale contents
    useEffect(() => {
      if (isStale && !isLoading) {
        refreshContents();
      }
    }, [isStale, isLoading, refreshContents]);
  
    return {
      children,
      isLoading,
      isStale,
      refreshContents
    };
  };

  const useBatchUpload = () => {
    const dispatch = useAppDispatch();
    const activeNode = useAppSelector(selectors.selectActiveNode);
    const { acquireLock, releaseLock } = useOperationLock();
  
    const uploadFiles = useCallback(async (
      files: File[],
      options: UploadOptions = {}
    ) => {
      if (!acquireLock('uploadFile', [])) return;
  
      try {
        const uploads = files.map(file => 
          dispatch(actions.uploadFile({
            file,
            options: {
              overwrite: options.overwrite,
              preserveMetadata: options.preserveMetadata,
              contentType: options.contentType,
              cacheControl: options.cacheControl
            }
          })).unwrap()
        );
  
        const results = await Promise.all(uploads);
        return results;
      } finally {
        releaseLock();
      }
    }, [dispatch, acquireLock, releaseLock]);
  
    const uploadFilesWithProgress = useCallback(async (
      files: File[],
      options: UploadOptions = {},
      onProgress?: (completed: number, total: number) => void
    ) => {
      if (!acquireLock('uploadFile', [])) return;
  
      try {
        const total = files.length;
        let completed = 0;
  
        const results = [];
        for (const file of files) {
          const result = await dispatch(actions.uploadFile({
            file,
            options
          })).unwrap();
          
          results.push(result);
          completed++;
          onProgress?.(completed, total);
        }
  
        return results;
      } finally {
        releaseLock();
      }
    }, [dispatch, acquireLock, releaseLock]);
  
    return {
      uploadFiles,
      uploadFilesWithProgress,
      currentFolder: activeNode,
      isRootUpload: !activeNode
    };
  };

  const useTreeStructure = () => {
    const dispatch = useAppDispatch();
    const isLoading = useAppSelector(selectors.selectIsLoading);
    const { acquireLock, releaseLock } = useOperationLock();
    
    // Get root level nodes
    const rootNodes = useAppSelector(selectors.selectNodeChildren(null));
    
    // Initialize and refresh tree
    const refreshTree = useCallback(async (forceFetch: boolean = false) => {
      if (acquireLock('listContents', [])) {
        try {
          await dispatch(actions.listContents({
            forceFetch,
            filter: undefined
          })).unwrap();
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, acquireLock, releaseLock]);
  
    // Load children of a specific node
    const loadNodeChildren = useCallback(async (
      nodeId: NodeItemId,
      options: ListOptions = {}
    ) => {
      if (acquireLock('listContents', [nodeId])) {
        try {
          await dispatch(actions.listContents({
            ...options,
            forceFetch: options.forceFetch || false
          })).unwrap();
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, acquireLock, releaseLock]);
  
    // Auto-initialize tree
    useEffect(() => {
      if (rootNodes.length === 0 && !isLoading) {
        refreshTree();
      }
    }, [rootNodes.length, isLoading, refreshTree]);
  
    return {
      rootNodes,
      isLoading,
      refreshTree,
      loadNodeChildren
    };
  };

  const useClipboardOperations = () => {
    const dispatch = useAppDispatch();
    const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
    const { acquireLock, releaseLock } = useOperationLock();
  
    const copyPublicUrls = useCallback(async () => {
      if (!selectedNodes.length) return;
      
      if (acquireLock('getPublicFile', selectedNodes.map(n => n.itemId))) {
        try {
          const urls = await Promise.all(
            selectedNodes.map(async (node) => {
              if (node.publicUrl) return node.publicUrl;
              
              const result = await dispatch(actions.getPublicFile({
                nodeId: node.itemId
              })).unwrap();
              
              return result.url;
            })
          );
          
          await navigator.clipboard.writeText(urls.join('\n'));
          return urls;
        } finally {
          releaseLock();
        }
      }
    }, [dispatch, selectedNodes, acquireLock, releaseLock]);
  
    const copyNodePaths = useCallback(async () => {
      if (!selectedNodes.length) return;
      
      const paths = selectedNodes.map(node => node.storagePath);
      await navigator.clipboard.writeText(paths.join('\n'));
      return paths;
    }, [selectedNodes]);
  
    return {
      copyPublicUrls,
      copyNodePaths,
      hasSelection: selectedNodes.length > 0,
      selectedCount: selectedNodes.length
    };
  };

  const useNode = (nodeId: NodeItemId) => {
    const dispatch = useAppDispatch();
    const node = useAppSelector(selectors.selectNode(nodeId));
    const children = useAppSelector(selectors.selectNodeChildren(nodeId));
    const isFolder = node?.contentType === "FOLDER";
    
    return {
      node,
      children,
      isFolder,
    };
  };
  
  return {
    useTreeTraversal,
    useFileOperations,
    useRangeSelection,
    useSelection,
    useNode,
    useNodeOps,
    useFolderContents,
    useTreeStructure,
    useClipboardOperations,
    useOperationLock,
    useBatchUpload,
    slice,
  };
};
