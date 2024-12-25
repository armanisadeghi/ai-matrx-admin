// providers/FileSystemProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToastManager } from '@/hooks/useToastManager';
import {
    FileSystemManager,
    BucketStructure,
    BucketTreeStructure,
    FileTypeDetails,
    getFileDetailsByExtension,
    isStructureWithContents, IconComponent,
    BucketStructureWithNodes, NodeStructure,
} from '@/utils/file-operations';
import {
    downloadBlob,
    fileNodeManager,
    getCreatePath,
    getFilenameFromPath,
    getParentPath
} from '@/utils/file-operations/utils';
import {FileSystemDialogProvider} from '@/components/FileManager/Dialogs/FileSystemDialogProvider';

import { useFileSystemStructure } from './useFileSystemStructure';
import { useFileSystemNavigation } from './useFileSystemNavigation';
import { useFileSystemOperations } from './useFileSystemOperations';
import { useFileSystemSync } from './useFileSystemSync';
import { useFileSystemConfig } from './useFileSystemConfig';
import { FileSystemState, SyncStatus } from './types';

// Using existing types from the system
const FileSystemContext = createContext<ReturnType<typeof useFileSystemProvider> | undefined>(undefined);

const useFileSystemProvider = () => {
    // Core state that needs to be shared across hooks
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentBucket, setCurrentBucket] = useState<string | null>(null);
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [activeNode, setActiveNode] = useState<NodeStructure | null>(null);
    const [structures, setStructures] = useState<Map<string, BucketStructureWithNodes>>(new Map());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        pendingUploads: 0,
        modifiedFiles: 0,
        conflicts: 0
    });

    const fileSystemManager = FileSystemManager.getInstance();
    const toast = useToastManager('storage');

    // Structure management with centralized state
    const structureUtils = useFileSystemStructure({
        fileSystemManager,
        isInitialized,
        currentBucket,
        structures,
        setStructures,
        setIsLoading
    });

    // Navigation with centralized state
    const navigationUtils = useFileSystemNavigation({
        fileSystemManager,
        structures,
        currentBucket,
        currentPath,
        activeNode,
        setCurrentBucket,
        setCurrentPath,
        setActiveNode
    });

    // File operations with centralized state
    const operationUtils = useFileSystemOperations({
        fileSystemManager,
        currentBucket,
        currentPath,
        isInitialized,
        refreshBucketStructure: structureUtils.refreshBucketStructure,
        refreshFolderContents: structureUtils.refreshFolderContents
    });

    // Sync management with centralized state
    const syncUtils = useFileSystemSync({
        fileSystemManager,
        isInitialized,
        syncStatus,
        setSyncStatus,
        refreshBucketStructure: structureUtils.refreshBucketStructure
    });

    // Config management with centralized state
    const configUtils = useFileSystemConfig({
        fileSystemManager,
        currentBucket,
        refreshBucketStructure: structureUtils.refreshBucketStructure
    });

    useEffect(() => {
        const initializeStorage = async () => {
            setIsLoading(true);
            try {
                await fileSystemManager.loadAllBucketStructures(true);
                const rawStructures = fileSystemManager.getAllBucketStructures();
                const processedStructures = fileNodeManager.processAllBucketStructures(rawStructures);
                setStructures(processedStructures);

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

    // Rest of the provider implementation...

    return {
        // Core state
        isLoading,
        isInitialized,
        currentBucket,
        currentPath,
        activeNode,
        structures,
        syncStatus,

        // Combine all utilities from hooks
        ...structureUtils,
        ...navigationUtils,
        ...operationUtils,
        ...syncUtils,
        fileConfigurationMethods: configUtils
    };
};

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const providerValue = useFileSystemProvider();

    // Add error boundary
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const handleError = (error: ErrorEvent) => {
            console.error('FileSystem Error:', error);
            setHasError(true);
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
        return (
            <div className="p-4">
                <h2>Something went wrong with the file system.</h2>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
                >
                    Reload
                </button>
            </div>
        );
    }

    return (
        <FileSystemContext.Provider value={providerValue}>
            <FileSystemDialogProvider>
                {children}
            </FileSystemDialogProvider>
        </FileSystemContext.Provider>
    );
};

// hooks/useFileSystem.ts
export const useFileSystem = () => {
    const context = useContext(FileSystemContext);
    if (context === undefined) {
        throw new Error('useFileSystem must be used within a FileSystemProvider');
    }
    return context;
};

export type UseFileSystemType = ReturnType<typeof useFileSystem>;