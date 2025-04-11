// hooks/useFileSystemSync.ts
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
import { SyncStatus } from './types';

interface SyncHookProps {
    fileSystemManager: FileSystemManager;
    isInitialized: boolean;
    refreshBucketStructure: (bucketName: string) => Promise<any>;
}

export const useFileSystemSync = ({
    fileSystemManager,
    isInitialized,
    refreshBucketStructure
}: SyncHookProps) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        pendingUploads: 0,
        modifiedFiles: 0,
        conflicts: 0
    });

    const toast = useToastManager('storage');

    const getSyncStatus = async () => {
        const localStorage = fileSystemManager.getLocalStorage();

        const pendingUploads = await localStorage.getPendingUploads();
        const modifiedFiles = await localStorage.getModifiedFiles();
        const conflicts = await localStorage.getConflicts();

        const status = {
            pendingUploads: pendingUploads.length,
            modifiedFiles: modifiedFiles.length,
            conflicts: conflicts.length
        };

        setSyncStatus(status);
        return status;
    };

    const withLoadingAndToast = async <T,>(
        operation: () => Promise<T>,
        successMessage: string,
        errorMessage: string
    ): Promise<T | null> => {
        return toast.loading(
            async () => {
                try {
                    return await operation();
                } catch (error) {
                    console.error('Sync operation error:', error);
                    return null;
                }
            },
            {
                loading: "Processing sync request...",
                success: successMessage,
                error: errorMessage
            }
        );
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

    const resolveConflict = async (bucketName: string, path: string, resolution: 'local' | 'remote') => {
        return withLoadingAndToast(
            async () => {
                const localStorage = fileSystemManager.getLocalStorage();
                await localStorage.resolveConflict(path, resolution);
                await getSyncStatus();
                await refreshBucketStructure(bucketName);
                return true;
            },
            'Conflict resolved successfully',
            'Failed to resolve conflict'
        );
    };

    const retryFailedUploads = async () => {
        return withLoadingAndToast(
            async () => {
                const localStorage = fileSystemManager.getLocalStorage();
                const pendingUploads = await localStorage.getPendingUploads();

                let success = true;
                for (const upload of pendingUploads) {
                    try {
                        await fileSystemManager.retryUpload(upload.id);
                    } catch (error) {
                        console.error(`Failed to retry upload ${upload.id}:`, error);
                        success = false;
                    }
                }

                await getSyncStatus();
                return success;
            },
            'Retried pending uploads successfully',
            'Some uploads failed to retry'
        );
    };

    const clearFailedUploads = async () => {
        return withLoadingAndToast(
            async () => {
                const localStorage = fileSystemManager.getLocalStorage();
                await localStorage.clearPendingUploads();
                await getSyncStatus();
                return true;
            },
            'Cleared failed uploads successfully',
            'Failed to clear uploads'
        );
    };

    useEffect(() => {
        const checkSyncStatus = async () => {
            const status = await getSyncStatus();
            setSyncStatus(status);
        };

        const interval = setInterval(checkSyncStatus, 90000); // Check every 90 seconds
        checkSyncStatus(); // Initial check

        return () => clearInterval(interval);
    }, []);

    return {
        syncStatus,
        getSyncStatus,
        forceSyncBucket,
        resolveConflict,
        retryFailedUploads,
        clearFailedUploads
    };
};