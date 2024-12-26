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
import { RootState } from "../store";
import { supabase } from "@/utils/supabase/client";
import {
  createNodeFromStorageItem,
  processStorageMetadata,
  shouldFetchContent,
  shouldFetchList,
} from "./fileSystemUtils";
import { createFile } from "@/utils/schema/schemaGenerator";
import { actions } from "react-table";

const createOperationThunk = <TArgs, TResult>(
  bucketName: AvailableBuckets,
  operationName: FileOperation,
  operation: (
    args: TArgs,
    helpers: { getState: () => RootState }
  ) => Promise<TResult>
) => {
  return createAsyncThunk<
    TResult,
    TArgs,
    { state: RootState; rejectValue: string }
  >(
    `${FILE_SYSTEM_ACTION_PREFIX}/${bucketName}/${operationName}`,
    async (args, { dispatch, getState }) => {
      try {
        dispatch({
          type: `fileSystem/${bucketName}/setOperationStatus`,
          payload: {
            type: operationName,
            status: { isLoading: true },
          },
        });

        const result = await operation(args, { getState });

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

export const createFileSystemOperations = (bucketName: AvailableBuckets) => {
    return {
      listContents: createOperationThunk<ListOptions, FileSystemNode[]>(
        bucketName,
        "listContents",
        async (
          {
            limit = 100,
            sortBy = { column: "name", order: "asc" },
            forceFetch = false,
            filter,
          },
          { getState }
        ) => {
          console.log("🚀 listContents called for bucket:", bucketName);
          const state = getState().fileSystem[bucketName];
          const activeNode = state.activeNode ? state.nodes[state.activeNode] : null;
  
          console.log("📦 Current state:", {
            activeNode: activeNode?.name,
            nodeCount: Object.keys(state.nodes).length,
            cacheSize: Object.keys(state.nodeCache).length,
          });
  
          // If we have an active node, use its storage path for listing
          const storagePath = activeNode?.storagePath || "";
          const parentId = activeNode?.itemid || null;
  
          console.log("📂 Request context:", {
            parentId,
            storagePath,
            forceFetch,
            hasCache: parentId && state.nodeCache[parentId],
          });
  
          // Check cache validity
          if (!forceFetch && parentId && state.nodeCache[parentId]) {
            const cache = state.nodeCache[parentId];
            console.log("🔍 Checking cache:", {
              isStale: cache.isStale,
              shouldFetch: shouldFetchList(cache),
              childCount: cache.childNodeIds.length,
            });
  
            if (!cache.isStale && !shouldFetchList(cache)) {
              let nodes = cache.childNodeIds
                .map((id) => state.nodes[id])
                .filter(Boolean);
  
              console.log("📂 Using cached nodes:", {
                count: nodes.length,
                nodes: nodes.map(n => ({ name: n.name, type: n.contentType }))
              });
  
              // Apply filters if specified
              if (filter) {
                if (filter.contentType) {
                  nodes = nodes.filter((n) =>
                    filter.contentType?.includes(n.contentType)
                  );
                }
                if (filter.extension) {
                  nodes = nodes.filter((n) =>
                    filter.extension?.includes(n.extension)
                  );
                }
              }
  
              // Apply sorting
              nodes = nodes.sort((a, b) => {
                if (a.contentType !== b.contentType) {
                  return a.contentType === "FOLDER" ? -1 : 1;
                }
                const aVal = a[sortBy.column as keyof FileSystemNode];
                const bVal = b[sortBy.column as keyof FileSystemNode];
                return sortBy.order === "asc"
                  ? String(aVal).localeCompare(String(bVal))
                  : String(bVal).localeCompare(String(aVal));
              });
  
              // Apply limit
              const limitedNodes = nodes.slice(0, limit);
              console.log("✅ Returning cached nodes:", {
                count: limitedNodes.length,
                types: limitedNodes.map(n => n.contentType)
              });
              return limitedNodes;
            }
          }
  
          console.log('📡 Fetching from Supabase:', {
            bucket: bucketName,
            path: storagePath,
            limit,
            sortBy
          });
  
          const { data, error } = await supabase.storage
            .from(bucketName)
            .list(storagePath, {
              limit,
              sortBy,
            });
  
          console.log('📥 Supabase response:', {
            hasData: !!data,
            dataLength: data?.length,
            error
          });
  
          if (error) throw error;
          if (!data) throw new Error("No data received");
  
          let nodes = data.map((item) => {
            const node = createNodeFromStorageItem(
              item,
              parentId,  // Pass the parent node's ID
              undefined  // No content yet
            );
            console.log('🔨 Created node:', {
              id: node.itemid,
              name: node.name,
              type: node.contentType,
              parentId: node.parentId,
              storagePath: node.storagePath
            });
            return node;
          });
  
          // Sort nodes (folders first, then by name)
          nodes = nodes.sort((a, b) => {
            if (a.contentType !== b.contentType) {
              return a.contentType === "FOLDER" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
  
          // Apply filters if specified
          if (filter) {
            if (filter.contentType) {
              nodes = nodes.filter((n) =>
                filter.contentType?.includes(n.contentType)
              );
            }
            if (filter.extension) {
              nodes = nodes.filter((n) =>
                filter.extension?.includes(n.extension)
              );
            }
          }
  
          console.log('✅ Returning fresh nodes:', {
            count: nodes.length,
            types: nodes.map(n => n.contentType),
            nodes: nodes.map(n => ({
              name: n.name,
              type: n.contentType,
              storagePath: n.storagePath
            }))
          });
  
          return nodes;
        }
      ),


      
    downloadFile: createOperationThunk<
      DownloadOptions,
      { nodeId: NodeItemId; blob: Blob; metadata: StorageMetadata }
    >(
      bucketName,
      "downloadFile",
      async ({ forceFetch = false, preferCache = true }, { getState }) => {
        const state = getState().fileSystem[bucketName];
        if (!state.activeNode) throw new Error("No active node");
        const node = state.nodes[state.activeNode];

        // Use cached content if available and valid
        if (
          !forceFetch &&
          preferCache &&
          node?.content &&
          !shouldFetchContent(node)
        ) {
          return {
            nodeId: node.itemid,
            blob: node.content.blob,
            metadata: node.metadata!, // We already have this from node creation
          };
        }

        // If we need to fetch, get just the blob
        const { data, error } = await supabase.storage
          .from(bucketName)
          .download(node.storagePath);

        if (error) throw error;
        if (!data) throw new Error("No data received");

        return {
          nodeId: node.itemid,
          blob: data,
          metadata: node.metadata!, // Use existing metadata
        };
      }
    ),
    // Enhanced upload with options
    uploadFile: createOperationThunk<
      { file: File; options?: UploadOptions },
      FileSystemNode
    >(
      bucketName,
      "uploadFile",
      async ({ file, options = {} }, { getState }) => {
        const state = getState().fileSystem[bucketName];
        const activeNode = state.activeNode
          ? state.nodes[state.activeNode]
          : null;
        const parentStoragePath = activeNode?.storagePath || "";

        const uploadPath = `${parentStoragePath}/${file.name}`.replace(
          /^\/+/,
          ""
        );

        // Prepare upload options
        const uploadOptions: any = {
          upsert: options.overwrite || false,
        };

        if (options.contentType) {
          uploadOptions.contentType = options.contentType;
        }

        if (options.cacheControl) {
          uploadOptions.cacheControl = options.cacheControl;
        }

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(uploadPath, file, uploadOptions);

        if (error) throw error;
        if (!data) throw new Error("No data received from upload");

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
          storageItem,
          activeNode?.itemid || null,
          { blob: file, isDirty: false }
        );
      }
    ),

    // Batch delete operation
    deleteFiles: createOperationThunk<
      BatchOperationOptions | undefined,
      NodeItemId[]
    >(bucketName, "deleteFile", async (options = {}, { getState }) => {
      const state = getState().fileSystem[bucketName];
      const selectedNodes = Array.from(state.selection.selectedNodes)
        .map((id) => state.nodes[id])
        .filter(Boolean);

      if (selectedNodes.length === 0) throw new Error("No nodes selected");

      const deletedIds: NodeItemId[] = [];
      const paths = selectedNodes.map((node) => node.storagePath);

      if (options.parallel) {
        // Parallel deletion with batch size control
        const batchSize = options.batchSize || 10;
        for (let i = 0; i < paths.length; i += batchSize) {
          const batch = paths.slice(i, i + batchSize);
          const batchNodes = selectedNodes.slice(i, i + batchSize);

          try {
            const { error } = await supabase.storage
              .from(bucketName)
              .remove(batch);

            if (error && !options.continueOnError) throw error;
            deletedIds.push(...batchNodes.map((n) => n.itemid));
          } catch (error) {
            if (!options.continueOnError) throw error;
          }
        }
      } else {
        // Sequential deletion
        const { error } = await supabase.storage.from(bucketName).remove(paths);

        if (error) throw error;
        deletedIds.push(...selectedNodes.map((n) => n.itemid));
      }

      return deletedIds;
    }),

    // Enhanced move operation with batch support
    moveFiles: createOperationThunk<
      { destinationNodeId: NodeItemId; options?: MoveOptions },
      FileSystemNode[]
    >(
      bucketName,
      "moveFile",
      async ({ destinationNodeId, options = {} }, { getState }) => {
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
                parentId: destinationNode.itemid,
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
      }
    ),

    syncNode: createOperationThunk<
      { nodeId: NodeItemId; options?: SyncOptions },
      FileSystemNode
    >(
      bucketName,
      "syncNode",
      async ({ nodeId, options = {} }, { getState }) => {
        const state = getState().fileSystem[bucketName];
        const node = state.nodes[nodeId];

        if (!node) throw new Error("Node not found");

        // If node is clean and not stale, return current state
        if (!options.forceFetch && !node.isDirty && !node.isStale) {
          return node;
        }

        // If it's a file and we need to sync content
        if (
          node.contentType === "FILE" &&
          (options.syncContent || node.isDirty)
        ) {
          if (node.isDirty && node.content?.blob) {
            // Upload local changes
            const { error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(node.storagePath, node.content.blob, { upsert: true });

            if (uploadError) throw uploadError;
          } else {
            // Download latest content
            const { data: content, error: downloadError } =
              await supabase.storage
                .from(bucketName)
                .download(node.storagePath);

            if (downloadError) throw downloadError;
            if (content) {
              node.content = { blob: content, isDirty: false };
            }
          }

          // Validate if requested
          if (options.validateContent) {
            const { data: validationData, error: validationError } =
              await supabase.storage
                .from(bucketName)
                .download(node.storagePath);

            if (validationError) throw validationError;
            if (!validationData) {
              throw new Error("Failed to validate content");
            }
          }
        }

        // Use existing metadata but update timestamps
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
      }
    ),

    // New create file operation
    createFile: createOperationThunk<CreateFileOptions, FileSystemNode>(
      bucketName,
      "createFile",
      async (
        { name, content, parentId = null, metadata = {}, ...options },
        { getState }
      ) => {
        const state = getState().fileSystem[bucketName];
        const parentNode = parentId ? state.nodes[parentId] : null;
        const parentPath = parentNode?.storagePath || "";

        // Prepare the file
        const file =
          content instanceof File ? content : new File([content], name);
        const uploadPath = `${parentPath}/${name}`.replace(/^\/+/, "");

        // Prepare upload options
        const uploadOptions: any = {
          upsert: options.overwrite || false,
          contentType: options.contentType || file.type,
          cacheControl: options.cacheControl,
        };

        // Perform upload
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(uploadPath, file, uploadOptions);

        if (error) throw error;
        if (!data) throw new Error("No data received from upload");

        // Create storage item with metadata
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

        // Create and return the node
        return createNodeFromStorageItem(storageItem, parentId, {
          blob: file,
          isDirty: false,
        });
      }
    ),
    // In createFileSystemOperations
    getPublicUrl: createOperationThunk<
      { nodeId: NodeItemId; expiresIn?: number },
      { nodeId: NodeItemId; url: string; isPublic: boolean }
    >(
      bucketName,
      "getPublicFile",
      async ({ nodeId, expiresIn }, { getState }) => {
        const state = getState().fileSystem[bucketName];
        const node = state.nodes[nodeId];

        if (!node) throw new Error("Node not found");
        if (node.contentType !== "FILE") throw new Error("Node is not a file");

        // First try to get public URL (if file is public)
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

        // If not public or failed, create signed URL
        const { data: signedData, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(
            node.storagePath,
            expiresIn || 3600 // Default 1 hour
          );

        if (error) throw error;
        if (!signedData) throw new Error("Failed to create URL");

        return {
          nodeId,
          url: signedData.signedUrl,
          isPublic: false,
        };
      }
    ),
  } as const;
};
