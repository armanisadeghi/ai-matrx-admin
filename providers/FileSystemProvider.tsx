// providers/FileSystemProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToastManager } from '@/hooks/useToastManager';
import {
    FileSystemManager,
    BucketStructure,
    BucketTreeStructure,
    FileTypeDetails,
    getFileDetailsByExtension,
    isStructureWithContents, IconComponent,
    BucketStructureWithNodes,
} from '@/utils/file-operations';
import { fileNodeManager } from '@/utils/file-operations/utils';
import { DialogProvider } from '@/components/FileManager/DialogManager';

export interface FileConfigurationMethods {
    // Add methods
    addHiddenFiles: (filenames: string[]) => void;
    addHiddenFolders: (foldernames: string[]) => void;
    addHiddenPrefixes: (prefixes: string[]) => void;
    addDisallowedFileTypes: (fileTypes: string[]) => void;

    // Remove methods
    removeHiddenFiles: (filenames: string[]) => void;
    removeHiddenFolders: (foldernames: string[]) => void;
    removeHiddenPrefixes: (prefixes: string[]) => void;
    removeDisallowedFileTypes: (fileTypes: string[]) => void;

    // Update methods
    updateMaxFileSize: (size: number) => void;

    // Reset methods
    resetToDefaults: () => void;
    resetHiddenFiles: () => void;
    resetHiddenFolders: () => void;
    resetHiddenPrefixes: () => void;
    resetDisallowedFileTypes: () => void;
    resetMaxFileSize: () => void;
}


interface StorageContextType {
    isLoading: boolean;
    currentBucket: string | null;
    // Core operations
    uploadFile: (bucketName: string, path: string, file: File) => Promise<boolean | null>;
    downloadFile: (bucketName: string, path: string) => Promise<Blob | null>;
    deleteFile: (bucketName: string, path: string) => Promise<boolean | null>;
    createFolder: (bucketName: string, path: string) => Promise<boolean | null>;
    copyFile: (bucketName: string, sourcePath: string, destinationPath: string) => Promise<boolean | null>;
    moveFile: (bucketName: string, oldPath: string, newPath: string) => Promise<boolean | null>;
    renameFile: (bucketName: string, oldPath: string, newPath: string) => Promise<boolean | null>;
    renameFolder: (bucketName: string, oldPath: string, newPath: string) => Promise<boolean | null>;

    // Structure management
    refreshBucketStructure: (bucketName: string) => Promise<BucketTreeStructure | null>;
    refreshFolderContents: (bucketName: string, folderPath: string) => Promise<boolean | null>;

    getBucketStructure: (bucketName: string) => BucketStructureWithNodes | undefined;
    getAllBucketStructures: () => Map<string, BucketStructureWithNodes>;

    // Utility methods
    fileConfigurationMethods: FileConfigurationMethods;

    getPublicUrl: (bucketName: string, path: string) => Promise<string>;
    getBuckets: () => Promise<any[]>;
    setCurrentBucket: (bucketName: string) => void;

    getFileDetails: (fileName: string) => FileTypeDetails;
    getFileIcon: (fileName: string) => IconComponent;
    getFileColor: (fileName: string) => string;
    filterFilesByCategory: (files: BucketStructure[], category: string) => BucketStructure[];
    filterFilesBySubCategory: (files: BucketStructure[], subCategory: string) => BucketStructure[];

    currentPath: string[];
    setCurrentPath: (path: string[]) => void;
    navigateToPath: (path: string | string[]) => void;
    navigateUp: () => void;
    getFullPath: () => string;

    getSignedUrl: (bucketName: string, filePath: string) => Promise<string | null>;
    getPublicUrlSync: (bucketName: string, filePath: string) => string;

    // Missing structure operations
    loadBucketStructure: (bucketName: string, forceRefresh?: boolean) => Promise<BucketTreeStructure | null>;
    loadAllBucketStructures: (forceRefresh?: boolean) => Promise<boolean>;

    // Missing utility methods
    getFilesByCategory: (bucketName: string) => Record<string, BucketStructure[]>;

    // Add sync status methods
    getSyncStatus: () => Promise<{
        pendingUploads: number;
        modifiedFiles: number;
        conflicts: number;
    }>;

    // Add force sync method
    forceSyncBucket: (bucketName: string) => Promise<boolean>;

}

const FileSystemContext = createContext<StorageContextType | undefined>(undefined);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentBucket, setCurrentBucket] = useState<string | null>(null);
    const fileSystemManager = FileSystemManager.getInstance();
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [syncStatus, setSyncStatus] = useState<{
        pendingUploads: number;
        modifiedFiles: number;
        conflicts: number;
    }>({
        pendingUploads: 0,
        modifiedFiles: 0,
        conflicts: 0
    });

    const toast = useToastManager('storage');

    useEffect(() => {
        const checkSyncStatus = async () => {
            const status = await getSyncStatus();
            setSyncStatus(status);
        };

        const interval = setInterval(checkSyncStatus, 90000); // Check every 90 seconds
        checkSyncStatus(); // Initial check

        return () => clearInterval(interval);
    }, []);

    // Register storage-specific default messages
    useEffect(() => {
        toast.register?.('storage', {
            success: "Storage operation completed successfully",
            error: "Storage operation failed",
            info: "Processing storage request",
            loading: "Storage operation in progress",
            warning: "Storage operation warning",
            notify: "Storage notification",
        });

        // Cleanup when component unmounts
        return () => toast.removeDefaults?.('storage');
    }, []);

    useEffect(() => {
        const initializeStorage = async () => {
            setIsLoading(true);
            try {
                await fileSystemManager.loadAllBucketStructures(true);
                toast.success("Storage system initialized successfully");
                setIsInitialized(true);
            } catch (error) {
                toast.error(error);
                console.error('Storage initialization error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeStorage();
    }, []);


    const processFileDetails = (structure: BucketStructure): BucketStructure => {
        if (structure.type !== 'folder') {
            structure.details = getFileDetailsByExtension(structure.path);
        }
        return structure;
    };

    const withLoadingAndToast = async <T,>(
        operation: () => Promise<T>,
        successMessage: string,
        errorMessage: string
    ): Promise<T | null> => {
        return toast.loading(
            async () => {
                setIsLoading(true);
                try {
                    const result = await operation();
                    if (result && isStructureWithContents(result)) {
                        result.contents = result.contents.map(processFileDetails);
                    }
                    return result;
                } finally {
                    setIsLoading(false);
                }
            },
            {
                loading: "Processing storage request...",
                success: successMessage,
                error: errorMessage
            }
        );
    };

    const navigateToPath = (path: string | string[]) => {
        if (typeof path === 'string') {
            setCurrentPath(path.split('/').filter(Boolean));
        } else {
            setCurrentPath(path);
        }
    };

    const navigateUp = () => {
        setCurrentPath(prev => prev.slice(0, -1));
    };

    const getFullPath = () => {
        return currentPath.join('/');
    };

    const handleSetCurrentBucket = (bucketName: string) => {
        setCurrentBucket(bucketName);
        setCurrentPath([]);
    };

    const getFileDetails = (fileName: string): FileTypeDetails => {
        return getFileDetailsByExtension(fileName);
    };

    const getFileIcon = (fileName: string): React.ComponentType => {
        return getFileDetailsByExtension(fileName).icon;
    };

    const getFileColor = (fileName: string): string => {
        return getFileDetailsByExtension(fileName).color;
    };

    const filterFilesByCategory = (files: BucketStructure[], category: string): BucketStructure[] => {
        return files.filter(file =>
            file.details?.category === category
        );
    };

    const filterFilesBySubCategory = (files: BucketStructure[], subCategory: string): BucketStructure[] => {
        return files.filter(file =>
            file.details?.subCategory === subCategory
        );
    };

    const getFilesByCategory = (bucketName: string): Record<string, BucketStructure[]> => {
        const structure = getBucketStructure(bucketName);
        if (!structure) return {};

        return structure.contents.reduce((acc, file) => {
            if (file.type !== 'folder') {
                const category = file.details?.category || 'UNKNOWN';
                acc[category] = acc[category] || [];
                acc[category].push(file);
            }
            return acc;
        }, {} as Record<string, BucketStructure[]>);
    };

    // Example of a function using the new withLoadingAndToast
    const uploadFile = async (bucketName: string, path: string, file: File) => {
        return withLoadingAndToast(
            async () => fileSystemManager.uploadFile(bucketName, path, file),
            `File ${file.name} uploaded successfully`,
            `Failed to upload ${file.name}`
        );
    };

    const downloadFile = async (bucketName: string, path: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.downloadFile(bucketName, path),
            'File downloaded successfully',
            'Failed to download file'
        );
    };

    const deleteFile = async (bucketName: string, path: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.deleteFile(bucketName, path),
            'File deleted successfully',
            'Failed to delete file'
        );
    };

    const createFolder = async (bucketName: string, path: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.createFolder(bucketName, path),
            'Folder created successfully',
            'Failed to create folder'
        );
    };

    const copyFile = async (bucketName: string, sourcePath: string, destinationPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.copyFile(bucketName, sourcePath, destinationPath),
            'File copied successfully',
            'Failed to copy file'
        );
    };

    const moveFile = async (bucketName: string, oldPath: string, newPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.moveFile(bucketName, oldPath, newPath),
            'File moved successfully',
            'Failed to move file'
        );
    };

    const renameFile = async (bucketName: string, oldPath: string, newPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.renameFile(bucketName, oldPath, newPath),
            'File renamed successfully',
            'Failed to rename file'
        );
    };

    const renameFolder = async (bucketName: string, oldPath: string, newPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.renameFolder(bucketName, oldPath, newPath),
            'Folder renamed successfully',
            'Failed to rename folder'
        );
    };

    const refreshBucketStructure = async (bucketName: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.loadBucketStructure(bucketName),
            'Bucket structure refreshed',
            'Failed to refresh bucket structure'
        );
    };

    const refreshFolderContents = async (bucketName: string, folderPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.refreshFolderContents(bucketName, folderPath),
            'Folder contents refreshed',
            'Failed to refresh folder contents'
        );
    };

    const getPublicUrl = (bucketName: string, path: string) =>
        fileSystemManager.getPublicUrl(bucketName, path);


    const getBucketStructure = (bucketName: string): BucketStructureWithNodes | undefined => {
        if (!isInitialized) return undefined;
        const structure = fileSystemManager.getBucketStructure(bucketName);
        if (!structure || !structure.contents) return undefined;
        return fileNodeManager.processBucketStructure(structure);
    };

    const getAllBucketStructures = (): Map<string, BucketStructureWithNodes> => {
        if (!isInitialized) return new Map();
        const allStructures = fileSystemManager.getAllBucketStructures();
        if (!allStructures) return new Map();
        return fileNodeManager.processAllBucketStructures(allStructures);
    };

    const getBuckets = async () =>
        fileSystemManager.getBuckets();

    const getSignedUrl = async (bucketName: string, filePath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.getSignedUrl(bucketName, filePath),
            'Signed URL generated successfully',
            'Failed to generate signed URL'
        );
    };

    const getPublicUrlSync = (bucketName: string, filePath: string) =>
        fileSystemManager.getPublicUrlSync(bucketName, filePath);

    const loadBucketStructure = async (bucketName: string, forceRefresh?: boolean) => {
        return withLoadingAndToast(
            () => fileSystemManager.loadBucketStructure(bucketName, forceRefresh),
            'Bucket structure loaded successfully',
            'Failed to load bucket structure'
        );
    };

    const loadAllBucketStructures = async (forceRefresh?: boolean) => {
        return withLoadingAndToast(
            () => fileSystemManager.loadAllBucketStructures(forceRefresh),
            'All bucket structures loaded successfully',
            'Failed to load bucket structures'
        );
    };

    const getSyncStatus = async () => {
        const fileSystemManager = FileSystemManager.getInstance();
        const localStorage = fileSystemManager.getLocalStorage();

        const pendingUploads = await localStorage.getPendingUploads();
        const modifiedFiles = await localStorage.getModifiedFiles();
        const conflicts = await localStorage.getConflicts();

        return {
            pendingUploads: pendingUploads.length,
            modifiedFiles: modifiedFiles.length,
            conflicts: conflicts.length
        };
    };

    const forceSyncBucket = async (bucketName: string) => {
        return withLoadingAndToast(
            async () => {
                await fileSystemManager.loadBucketStructure(bucketName, true);
                const status = await getSyncStatus();
                if (status.conflicts > 0) {
                    toast.warning(`Found ${status.conflicts} conflicts that need resolution`);
                }
                return true;
            },
            'Bucket synced successfully',
            'Failed to sync bucket'
        );
    };

    const fileConfigurationMethods: FileConfigurationMethods = {
        // Add methods
        addHiddenFiles: (filenames: string[]) => {
            fileNodeManager.addHiddenFiles(filenames);
        },

        addHiddenFolders: (foldernames: string[]) => {
            fileNodeManager.addHiddenFolders(foldernames);
        },

        addHiddenPrefixes: (prefixes: string[]) => {
            fileNodeManager.addHiddenPrefixes(prefixes);
        },

        addDisallowedFileTypes: (fileTypes: string[]) => {
            fileNodeManager.addDisallowedFileTypes(fileTypes);
        },

        // Remove methods
        removeHiddenFiles: (filenames: string[]) => {
            fileNodeManager.removeHiddenFiles(filenames);
        },

        removeHiddenFolders: (foldernames: string[]) => {
            fileNodeManager.removeHiddenFolders(foldernames);
        },

        removeHiddenPrefixes: (prefixes: string[]) => {
            fileNodeManager.removeHiddenPrefixes(prefixes);
        },

        removeDisallowedFileTypes: (fileTypes: string[]) => {
            fileNodeManager.removeDisallowedFileTypes(fileTypes);
        },

        // Update methods
        updateMaxFileSize: (size: number) => {
            fileNodeManager.updateMaxFileSize(size);
        },

        // Reset methods
        resetToDefaults: () => {
            fileNodeManager.resetToDefaults();
        },

        resetHiddenFiles: () => {
            fileNodeManager.resetHiddenFiles();
        },

        resetHiddenFolders: () => {
            fileNodeManager.resetHiddenFolders();
        },

        resetHiddenPrefixes: () => {
            fileNodeManager.resetHiddenPrefixes();
        },

        resetDisallowedFileTypes: () => {
            fileNodeManager.resetDisallowedFileTypes();
        },

        resetMaxFileSize: () => {
            fileNodeManager.resetMaxFileSize();
        }
    };




    const value = {
        isLoading,
        currentBucket,
        currentPath,
        setCurrentPath,
        navigateToPath,
        navigateUp,
        getFullPath,
        setCurrentBucket: handleSetCurrentBucket,
        uploadFile,
        downloadFile,
        deleteFile,
        createFolder,
        copyFile,
        moveFile,
        renameFile,
        renameFolder,
        refreshBucketStructure,
        refreshFolderContents,
        getPublicUrl,
        getBucketStructure,
        getAllBucketStructures,
        getBuckets,
        getFileDetails,
        getFileIcon,
        getFileColor,
        filterFilesByCategory,
        filterFilesBySubCategory,
        getFilesByCategory,
        getSignedUrl,
        getPublicUrlSync,
        loadBucketStructure,
        loadAllBucketStructures,
        getSyncStatus,
        forceSyncBucket,
        syncStatus,
        fileConfigurationMethods,
    };

    return (
        <FileSystemContext.Provider value={value}>
            <DialogProvider>
                {children}
            </DialogProvider>
        </FileSystemContext.Provider>
    );
};

export const useFileSystem = () => {
    const context = useContext(FileSystemContext);
    if (context === undefined) {
        throw new Error('useStorage must be used within a FileSystemProvider');
    }
    return context;
};
