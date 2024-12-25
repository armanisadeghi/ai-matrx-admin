// thunks.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  FILE_SYSTEM_ACTION_PREFIX,
  FileManagement,
  NodeItemId,
  FileSystemNode,
  StorageMetadata,
} from "./types";
import { RootState } from "../store";
import { supabase } from "@/utils/supabase/client";
import {
  createNodeFromStorageItem,
  normalizeStoragePath,
  processStorageMetadata,
} from "./fileSystemUtils";

interface OperationStatus {
  isLoading: boolean;
  error?: string;
  data?: any;
}

const createSliceActions = (bucketName: string) => ({
  setOperationStatus: (payload: {
    operation: string;
    status: OperationStatus;
  }) => ({
    type: `fileSystem/${bucketName}/setOperationStatus`,
    payload,
  }),
});

export const createOperationThunk = <TArgs, TResult>(
  bucketName: string,
  operationName: string,
  operation: (args: TArgs) => Promise<TResult>
) => {
  const sliceActions = createSliceActions(bucketName);

  return createAsyncThunk<
    TResult,
    TArgs,
    {
      state: RootState;
      rejectValue: string;
    }
  >(
    `${FILE_SYSTEM_ACTION_PREFIX}/${bucketName}/${operationName}`,
    async (args, { dispatch }) => {
      try {
        dispatch(
          sliceActions.setOperationStatus({
            operation: operationName,
            status: { isLoading: true },
          })
        );

        const result = await operation(args);

        dispatch(
          sliceActions.setOperationStatus({
            operation: operationName,
            status: { isLoading: false, data: result },
          })
        );

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        dispatch(
          sliceActions.setOperationStatus({
            operation: operationName,
            status: { isLoading: false, error: errorMessage },
          })
        );
        throw error;
      }
    }
  );
};

interface ListOptions {
  path?: string;
  limit?: number;
  sortBy?: {
    column: string;
    order: "asc" | "desc";
  };
}

export const listContents = (bucketName: string) =>
  createOperationThunk<ListOptions, FileSystemNode[]>(
    bucketName,
    "listContents",
    async ({
      path = "",
      limit = 100,
      sortBy = { column: "name", order: "asc" },
    }) => {
      const normalizedPath = normalizeStoragePath(path);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(normalizedPath, {
          limit,
          sortBy,
          // Add any additional RLS-specific options here
        });

      if (error) throw error;
      if (!data) throw new Error("No data received");

      return data.map((item) =>
        createNodeFromStorageItem(item, normalizedPath)
      );
    }
  );

// Private file download (requires authentication)
export const downloadFile = (bucketName: string) =>
  createOperationThunk<
    { path: string; nodeId: NodeItemId },
    { nodeId: NodeItemId; blob: Blob; metadata: StorageMetadata }
  >(bucketName, "downloadFile", async ({ path, nodeId }) => {
    const normalizedPath = normalizeStoragePath(path);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(normalizedPath);

    if (error) throw error;
    if (!data) throw new Error("No data received");

    // Get metadata from the file name and path
    const fileName = normalizedPath.split("/").pop() || "";
    const metadata: StorageMetadata = {
      name: fileName,
      id: null, // We don't get this from download
      updated_at: null,
      created_at: null,
      last_accessed_at: null,
      eTag: "",
      size: data.size,
      mimetype: data.type,
      cacheControl: "",
      lastModified: new Date().toISOString(),
      contentLength: data.size,
      httpStatusCode: 200,
    };

    return {
      nodeId,
      blob: data,
      metadata,
    };
  });

export const getPublicFile = (bucketName: string) =>
  createOperationThunk<
    { path: string; nodeId: NodeItemId },
    { nodeId: NodeItemId; url: string }
  >(bucketName, "getPublicFile", async ({ path, nodeId }) => {
    const normalizedPath = normalizeStoragePath(path);

    const { data } = await supabase.storage
      .from(bucketName)
      .getPublicUrl(normalizedPath);

    if (!data?.publicUrl) throw new Error("No public URL available");

    return {
      nodeId,
      url: data.publicUrl,
    };
  });

export const uploadFile = (bucketName: string) =>
  createOperationThunk<{ path: string; file: File }, FileSystemNode>(
    bucketName,
    "uploadFile",
    async ({ path, file }) => {
      const normalizedPath = normalizeStoragePath(`${path}/${file.name}`);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(normalizedPath, file);

      if (error) throw error;
      if (!data) throw new Error("No data received from upload");

      const storageItem = {
        name: file.name,
        id: data.path, // Supabase returns path as ID for uploaded files
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        metadata: {
          mimetype: file.type,
          size: file.size,
          contentLength: file.size,
          lastModified: new Date().toISOString(),
        },
      };

      return createNodeFromStorageItem(
        storageItem,
        normalizeStoragePath(path),
        { blob: file, isDirty: false }
      );
    }
  );

export const deleteFile = (bucketName: string) =>
  createOperationThunk<{ path: string; nodeId: NodeItemId }, NodeItemId>(
    bucketName,
    "deleteFile",
    async ({ path, nodeId }) => {
      const normalizedPath = normalizeStoragePath(path);
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([normalizedPath]);

      if (error) throw error;
      return nodeId;
    }
  );

export const moveFile = (bucketName: string) =>
  createOperationThunk<
    {
      sourcePath: string;
      destinationPath: string;
      nodeId: NodeItemId;
      existingNode: FileSystemNode; // Pass the existing node
    },
    FileSystemNode
  >(
    bucketName,
    "moveFile",
    async ({ sourcePath, destinationPath, nodeId, existingNode }) => {
      const normalizedSourcePath = normalizeStoragePath(sourcePath);
      const normalizedDestPath = normalizeStoragePath(destinationPath);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .move(normalizedSourcePath, normalizedDestPath);

      if (error) throw error;

      const parentPath = normalizedDestPath.split("/").slice(0, -1).join("/");

      // Maintain the existing node's data, just update the path-related properties
      return {
        ...existingNode,
        storagePath: normalizedDestPath,
        parentId: parentPath || null,
        name: normalizedDestPath.split("/").pop() || existingNode.name,
        // Update the metadata path if it exists
        metadata: existingNode.metadata
          ? {
              ...existingNode.metadata,
              name: normalizedDestPath.split("/").pop() || existingNode.name,
            }
          : undefined,
        // Mark as not dirty since we just saved it
        isDirty: false,
        lastSynced: new Date().toISOString(),
      };
    }
  );

// IDB operations can be implemented later
const uploadToSupabase = async (node: FileSystemNode) => {
  throw new Error("Not implemented");
};

const updateIDB = async (node: FileSystemNode) => {
  throw new Error("Not implemented");
};

export const syncNode = createAsyncThunk<
  FileSystemNode,
  { nodeId: NodeItemId; bucketName: string },
  { state: RootState }
>("filesystem/syncNode", async ({ nodeId, bucketName }, { getState }) => {
  const state = getState();
  const node = state.fileSystem[bucketName].nodes[nodeId];

  if (!node) throw new Error("Node not found");

  if (node.isDirty && node.content?.blob) {
    // Upload the dirty content
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(node.storagePath, node.content.blob, {
        upsert: true,
      });

    if (error) throw error;

    // Update IDB when implemented
    // await updateIDB(node);

    return {
      ...node,
      isDirty: false,
      lastSynced: new Date().toISOString(),
    };
  }
  return node;
});
