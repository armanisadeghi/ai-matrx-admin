// hooks/useFileSystemOperations.ts
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


interface FileOperationsHookProps {
    fileSystemManager: FileSystemManager;
    currentBucket: string | null;
    currentPath: string[];
    isInitialized: boolean;
    refreshBucketStructure: (bucketName: string) => Promise<BucketStructureWithNodes | undefined>;
    refreshFolderContents: (bucketName: string, folderPath: string) => Promise<boolean>;
}

export const useFileSystemOperations = ({
    fileSystemManager,
    currentBucket,
    currentPath,
    isInitialized,
    refreshBucketStructure,
    refreshFolderContents
}: FileOperationsHookProps) => {
    const toast = useToastManager('storage');

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
                    console.error('Operation error:', error);
                    return null;
                }
            },
            {
                loading: "Processing storage request...",
                success: successMessage,
                error: errorMessage
            }
        );
    };

    const updateStructureAfterOperation = async (
        operation: 'add' | 'delete' | 'rename' | 'move',
        bucketName: string,
        path: string,
        newPath?: string
    ) => {
        const structure = await refreshBucketStructure(bucketName);
        if (!structure) return false;

        if (operation === 'add' || operation === 'move') {
            await refreshFolderContents(bucketName, getParentPath(path.split('/')).join('/'));
        }
        return true;
    };

    const uploadFile = async (bucketName: string, path: string, file: File) => {
        const result = await withLoadingAndToast(
            async () => {
                const uploadResult = await fileSystemManager.uploadFile(bucketName, path, file);
                if (uploadResult) {
                    await updateStructureAfterOperation('add', bucketName, path);
                }
                return uploadResult;
            },
            `File ${file.name} uploaded successfully`,
            `Failed to upload ${file.name}`
        );
        return result;
    };

    const downloadFile = async () => {
        if (!currentBucket || !currentPath.length) return false;

        try {
            const blob = await withLoadingAndToast(
                () => fileSystemManager.downloadFile(currentBucket, currentPath.join('/')),
                'File downloaded successfully',
                'Failed to download file'
            );

            if (!blob) return false;

            const fileName = currentPath[currentPath.length - 1];
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return true;
        } catch (error) {
            console.error('Error downloading file:', error);
            return false;
        }
    };

    const deleteFile = async () => {
        if (!currentBucket || !currentPath.length) return false;

        return withLoadingAndToast(
            async () => {
                const result = await fileSystemManager.deleteFile(currentBucket!, currentPath.join('/'));
                if (result) {
                    await updateStructureAfterOperation('delete', currentBucket!, currentPath.join('/'));
                }
                return result;
            },
            'File deleted successfully',
            'Failed to delete file'
        );
    };

    const moveFile = async (bucketName: string, oldPath: string, newPath: string) => {
        return withLoadingAndToast(
            async () => {
                const result = await fileSystemManager.moveFile(bucketName, oldPath, newPath);
                if (result) {
                    await updateStructureAfterOperation('move', bucketName, oldPath, newPath);
                }
                return result;
            },
            'File moved successfully',
            'Failed to move file'
        );
    };

    const copyFile = async (bucketName: string, sourcePath: string, destinationPath: string) => {
        return withLoadingAndToast(
            async () => {
                const result = await fileSystemManager.copyFile(bucketName, sourcePath, destinationPath);
                if (result) {
                    await updateStructureAfterOperation('add', bucketName, destinationPath);
                }
                return result;
            },
            'File copied successfully',
            'Failed to copy file'
        );
    };

    const renameFile = async (bucketName: string, oldPath: string, newPath: string) => {
        return withLoadingAndToast(
            async () => {
                const result = await fileSystemManager.renameFile(bucketName, oldPath, newPath);
                if (result) {
                    await updateStructureAfterOperation('rename', bucketName, oldPath, newPath);
                }
                return result;
            },
            'File renamed successfully',
            'Failed to rename file'
        );
    };

    const createFolder = async (bucketName: string, path: string) => {
        return withLoadingAndToast(
            async () => {
                const result = await fileSystemManager.createFolder(bucketName, path);
                if (result) {
                    await updateStructureAfterOperation('add', bucketName, path);
                }
                return result;
            },
            'Folder created successfully',
            'Failed to create folder'
        );
    };

    const uploadFilesToCurrentFolder = async (): Promise<boolean> => {
        if (!currentBucket) return false;

        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = async (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (!files) {
                    resolve(false);
                    return;
                }

                let success = true;
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const filePath = currentPath.length
                        ? `${currentPath.join('/')}/${file.name}`
                        : file.name;
                    const result = await uploadFile(currentBucket, filePath, file);
                    if (!result) success = false;
                }

                resolve(success);
            };
            input.click();
        });
    };

    return {
        uploadFile,
        downloadFile,
        deleteFile,
        moveFile,
        copyFile,
        renameFile,
        createFolder,
        uploadFilesToCurrentFolder
    };
};