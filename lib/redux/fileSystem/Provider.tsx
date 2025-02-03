// lib/redux/fileSystem/FileSystemProvider.tsx
import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { createFileSystemHooks } from "./hooks";
import { createFileSystemSelectors } from "./selectors";
import { AvailableBuckets, NodeItemId } from "./types";
import { availableBuckets } from "../rootReducer";

// Validation helper
const validateAndFilterBuckets = (
  bucketsToValidate: readonly AvailableBuckets[]
) => {
  const validBuckets: AvailableBuckets[] = [];
  bucketsToValidate.forEach((bucket) => {
    if (availableBuckets.includes(bucket)) {
      validBuckets.push(bucket);
    } else {
      console.error(
        `Invalid bucket provided: ${bucket}. Must be one of:`,
        availableBuckets
      );
    }
  });
  return validBuckets as readonly AvailableBuckets[];
};

// Initialize hooks and selectors
const bucketHooksMap = availableBuckets.reduce((acc, bucket) => {
  acc.set(bucket, createFileSystemHooks(bucket));
  return acc;
}, new Map<AvailableBuckets, ReturnType<typeof createFileSystemHooks>>());

const bucketSelectorsMap = availableBuckets.reduce((acc, bucket) => {
  acc.set(bucket, createFileSystemSelectors(bucket));
  return acc;
}, new Map<AvailableBuckets, ReturnType<typeof createFileSystemSelectors>>());

interface FileSystemContextValue {
  availableBuckets: readonly AvailableBuckets[];
  activeBucket: AvailableBuckets;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  setActiveBucket: (bucket: AvailableBuckets) => Promise<void>;
  getHooksForBucket: (bucket: AvailableBuckets) => {
    useTreeTraversal: () => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useTreeTraversal"]
    >;
    useFileOperations: () => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useFileOperations"]
    >;
    useRangeSelection: () => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useRangeSelection"]
    >;
    useSelection: () => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useSelection"]
    >;
    useNodeOps: (
      nodeId: NodeItemId
    ) => ReturnType<ReturnType<typeof createFileSystemHooks>["useNodeOps"]>;
    useNode: (
      nodeId: NodeItemId
    ) => ReturnType<ReturnType<typeof createFileSystemHooks>["useNode"]>;
    useFolderContents: (
      nodeId?: NodeItemId | null
    ) => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useFolderContents"]
    >;
    useTreeStructure: () => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useTreeStructure"]
    >;
    useClipboardOperations: () => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useClipboardOperations"]
    >;
    useOperationLock: () => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useOperationLock"]
    >;
    useBatchUpload: () => ReturnType<
      ReturnType<typeof createFileSystemHooks>["useBatchUpload"]
    >;
  };
}

const FileSystemContext = createContext<FileSystemContextValue | null>(null);

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error("useFileSystem must be used within a FileSystemProvider");
  }
  return context;
}

interface FileSystemProviderProps {
  children: React.ReactNode;
  initialBucket: AvailableBuckets;
  allowedBuckets?: readonly AvailableBuckets[];
}

export function FileSystemProvider({
  children,
  allowedBuckets: providedBuckets,
  initialBucket,
}: FileSystemProviderProps) {
  const dispatch = useAppDispatch();
  const [activeBucket, setActiveBucketState] =
    useState<AvailableBuckets>(initialBucket);

  // Get all state in the component body
  const fileSystemState = useAppSelector(
    (state) => state.fileSystem[activeBucket]
  );
  const { isInitialized, isLoading, error } = fileSystemState;

  // Validate buckets and store result
  const availableBucketsList = useMemo(() => {
    const bucketsToUse = providedBuckets || availableBuckets;
    return validateAndFilterBuckets(bucketsToUse);
  }, [providedBuckets]);

  // Validate initial bucket
  useEffect(() => {
    if (!availableBucketsList.includes(initialBucket)) {
      console.error(
        `Invalid initial bucket: ${initialBucket}. Must be one of:`,
        availableBucketsList
      );
    }
  }, [initialBucket, availableBucketsList]);

  const initializeBucket = useCallback(
    async (bucket: AvailableBuckets) => {
      // console.log("Initializing bucket:", bucket);
      const hooks = bucketHooksMap.get(bucket);
      if (hooks) {
        try {
          const { actions } = hooks.slice;
          // console.log("Starting listContents for bucket:", bucket);
          await dispatch(actions.listContents({ forceFetch: true }));
        } catch (error) {
          console.error("Error initializing bucket:", bucket, error);
          throw error;
        }
      }
    },
    [dispatch]
  );

  const setActiveBucket = useCallback(
    async (bucket: AvailableBuckets) => {
      console.log("Setting active bucket:", bucket);
      if (!availableBucketsList.includes(bucket)) {
        const error = `Invalid bucket: ${bucket}. Must be one of: ${availableBucketsList.join(
          ", "
        )}`;
        console.error(error);
        throw new Error(error);
      }

      try {
        setActiveBucketState(bucket);
        await initializeBucket(bucket);
        console.log("Active bucket set and initialized:", bucket);
      } catch (error) {
        console.error("Failed to set active bucket:", bucket, error);
        throw error;
      }
    },
    [initializeBucket, availableBucketsList]
  );

  const getHooksForBucket = useCallback((bucket: AvailableBuckets) => {
    const hooks = bucketHooksMap.get(bucket);
    if (!hooks) {
      throw new Error(`Hooks not found for bucket: ${bucket}`);
    }
    return hooks;
  }, []);

  // Initialize initial bucket on mount
  useEffect(() => {
    // console.log("Provider mount - initializing initial bucket:", initialBucket);
    initializeBucket(initialBucket).catch((error) =>
      console.error("Error in initial bucket setup:", error)
    );
  }, [initialBucket, initializeBucket]);

  const value = useMemo(
    () => ({
      availableBuckets: availableBucketsList,
      activeBucket,
      isInitialized,
      isLoading,
      error,
      setActiveBucket,
      getHooksForBucket,
    }),
    [
      availableBucketsList,
      activeBucket,
      isInitialized,
      isLoading,
      error,
      setActiveBucket,
      getHooksForBucket,
    ]
  );

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
}
