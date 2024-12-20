// providers/FileSystemProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import FileSystemManager, {BucketTreeStructure} from '@/utils/supabase/FileSystemManager';
import { useToastManager } from '@/hooks/useToastManager';

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
    getBucketStructure: (bucketName: string) => BucketTreeStructure | undefined;
    getAllBucketStructures: () => Map<string, BucketTreeStructure>;

    // Utility methods
    getPublicUrl: (bucketName: string, path: string) => string;
    getBuckets: () => Promise<any[]>;
    setCurrentBucket: (bucketName: string) => void;
}

const FileSystemContext = createContext<StorageContextType | undefined>(undefined);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [currentBucket, setCurrentBucket] = useState<string | null>(null);
    const fileSystemManager = FileSystemManager.getInstance();

    const toast = useToastManager('storage');

    // Register storage-specific default messages
    useEffect(() => {
        toast.register?.('storage', {
            success: "Storage operation completed successfully",
            error: "Storage operation failed",
            info: "Processing storage request",
            loading: "Storage operation in progress",
            warning: "Storage operation warning",
            notify: "Storage notification"
        });

        // Cleanup when component unmounts
        return () => toast.removeDefaults?.('storage');
    }, []);

    // Initialize storage manager
    useEffect(() => {
        const initializeStorage = async () => {
            setIsLoading(true);
            try {
                await fileSystemManager.loadAllBucketStructures();
                toast.success("Storage system initialized successfully");
            } catch (error) {
                toast.error(error); // The error handling is built into the toast manager
                console.error('Storage initialization error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeStorage();
    }, []);

    // Wrapper function for operations with loading state and toast notifications
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

    // Direct access methods (no loading state or toast needed)
    const getPublicUrl = (bucketName: string, path: string) =>
        fileSystemManager.getPublicUrl(bucketName, path);

    const getBucketStructure = (bucketName: string) =>
        fileSystemManager.getBucketStructure(bucketName);

    const getAllBucketStructures = () =>
        fileSystemManager.getAllBucketStructures();

    const getBuckets = async () =>
        fileSystemManager.getBuckets();

    const value = {
        isLoading,
        currentBucket,
        setCurrentBucket,
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
    };

    return (
        <FileSystemContext.Provider value={value}>
            {children}
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

// Usage example:
/*
function App() {
    return (
        <FileSystemProvider>
            <YourComponents />
        </FileSystemProvider>
    );
}

function YourComponent() {
    const { 
        uploadFile, 
        downloadFile, 
        isLoading,
        getBucketStructure 
    } = useStorage();

    const handleUpload = async (file: File) => {
        const success = await uploadFile('my-bucket', 'path/to/file.pdf', file);
        if (success) {
            // Handle successful upload
        }
    };

    return (
        <div>
            {isLoading ? (
                <LoadingSpinner />
            ) : (
                // Your component content
            )}
        </div>
    );
}
*/