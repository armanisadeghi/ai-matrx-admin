// hooks/useFileSystemConfig.ts
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

interface FileConfigurationMethods {
    addHiddenFiles: (filenames: string[]) => void;
    addHiddenFolders: (foldernames: string[]) => void;
    addHiddenPrefixes: (prefixes: string[]) => void;
    addDisallowedFileTypes: (fileTypes: string[]) => void;
    removeHiddenFiles: (filenames: string[]) => void;
    removeHiddenFolders: (foldernames: string[]) => void;
    removeHiddenPrefixes: (prefixes: string[]) => void;
    removeDisallowedFileTypes: (fileTypes: string[]) => void;
    updateMaxFileSize: (size: number) => void;
    resetToDefaults: () => void;
    resetHiddenFiles: () => void;
    resetHiddenFolders: () => void;
    resetHiddenPrefixes: () => void;
    resetDisallowedFileTypes: () => void;
    resetMaxFileSize: () => void;
}

interface ConfigHookProps {
    fileSystemManager: FileSystemManager;
    refreshBucketStructure: (bucketName: string) => Promise<any>;
    currentBucket: string | null;
}

export const useFileSystemConfig = ({
    fileSystemManager,
    refreshBucketStructure,
    currentBucket
}: ConfigHookProps) => {
    const toast = useToastManager('storage');
    const fileNodeManager = fileSystemManager.getFileNodeManager();

    const withToastAndRefresh = async (
        operation: () => void,
        successMessage: string,
        errorMessage: string
    ) => {
        try {
            operation();
            toast.success(successMessage);
            if (currentBucket) {
                await refreshBucketStructure(currentBucket);
            }
            return true;
        } catch (error) {
            console.error('Configuration error:', error);
            toast.error(errorMessage);
            return false;
        }
    };

    const addHiddenFiles = useCallback(async (filenames: string[]) => {
        return withToastAndRefresh(
            () => fileNodeManager.addHiddenFiles(filenames),
            'Hidden files added successfully',
            'Failed to add hidden files'
        );
    }, [fileNodeManager]);

    const addHiddenFolders = useCallback(async (foldernames: string[]) => {
        return withToastAndRefresh(
            () => fileNodeManager.addHiddenFolders(foldernames),
            'Hidden folders added successfully',
            'Failed to add hidden folders'
        );
    }, [fileNodeManager]);

    const addHiddenPrefixes = useCallback(async (prefixes: string[]) => {
        return withToastAndRefresh(
            () => fileNodeManager.addHiddenPrefixes(prefixes),
            'Hidden prefixes added successfully',
            'Failed to add hidden prefixes'
        );
    }, [fileNodeManager]);

    const addDisallowedFileTypes = useCallback(async (fileTypes: string[]) => {
        return withToastAndRefresh(
            () => fileNodeManager.addDisallowedFileTypes(fileTypes),
            'Disallowed file types added successfully',
            'Failed to add disallowed file types'
        );
    }, [fileNodeManager]);

    const removeHiddenFiles = useCallback(async (filenames: string[]) => {
        return withToastAndRefresh(
            () => fileNodeManager.removeHiddenFiles(filenames),
            'Hidden files removed successfully',
            'Failed to remove hidden files'
        );
    }, [fileNodeManager]);

    const removeHiddenFolders = useCallback(async (foldernames: string[]) => {
        return withToastAndRefresh(
            () => fileNodeManager.removeHiddenFolders(foldernames),
            'Hidden folders removed successfully',
            'Failed to remove hidden folders'
        );
    }, [fileNodeManager]);

    const removeHiddenPrefixes = useCallback(async (prefixes: string[]) => {
        return withToastAndRefresh(
            () => fileNodeManager.removeHiddenPrefixes(prefixes),
            'Hidden prefixes removed successfully',
            'Failed to remove hidden prefixes'
        );
    }, [fileNodeManager]);

    const removeDisallowedFileTypes = useCallback(async (fileTypes: string[]) => {
        return withToastAndRefresh(
            () => fileNodeManager.removeDisallowedFileTypes(fileTypes),
            'Disallowed file types removed successfully',
            'Failed to remove disallowed file types'
        );
    }, [fileNodeManager]);

    const updateMaxFileSize = useCallback(async (size: number) => {
        return withToastAndRefresh(
            () => fileNodeManager.updateMaxFileSize(size),
            'Max file size updated successfully',
            'Failed to update max file size'
        );
    }, [fileNodeManager]);

    const resetToDefaults = useCallback(async () => {
        return withToastAndRefresh(
            () => fileNodeManager.resetToDefaults(),
            'Settings reset to defaults successfully',
            'Failed to reset settings'
        );
    }, [fileNodeManager]);

    const resetHiddenFiles = useCallback(async () => {
        return withToastAndRefresh(
            () => fileNodeManager.resetHiddenFiles(),
            'Hidden files reset successfully',
            'Failed to reset hidden files'
        );
    }, [fileNodeManager]);

    const resetHiddenFolders = useCallback(async () => {
        return withToastAndRefresh(
            () => fileNodeManager.resetHiddenFolders(),
            'Hidden folders reset successfully',
            'Failed to reset hidden folders'
        );
    }, [fileNodeManager]);

    const resetHiddenPrefixes = useCallback(async () => {
        return withToastAndRefresh(
            () => fileNodeManager.resetHiddenPrefixes(),
            'Hidden prefixes reset successfully',
            'Failed to reset hidden prefixes'
        );
    }, [fileNodeManager]);

    const resetDisallowedFileTypes = useCallback(async () => {
        return withToastAndRefresh(
            () => fileNodeManager.resetDisallowedFileTypes(),
            'Disallowed file types reset successfully',
            'Failed to reset disallowed file types'
        );
    }, [fileNodeManager]);

    const resetMaxFileSize = useCallback(async () => {
        return withToastAndRefresh(
            () => fileNodeManager.resetMaxFileSize(),
            'Max file size reset successfully',
            'Failed to reset max file size'
        );
    }, [fileNodeManager]);

    const methods: FileConfigurationMethods = {
        addHiddenFiles,
        addHiddenFolders,
        addHiddenPrefixes,
        addDisallowedFileTypes,
        removeHiddenFiles,
        removeHiddenFolders,
        removeHiddenPrefixes,
        removeDisallowedFileTypes,
        updateMaxFileSize,
        resetToDefaults,
        resetHiddenFiles,
        resetHiddenFolders,
        resetHiddenPrefixes,
        resetDisallowedFileTypes,
        resetMaxFileSize
    };

    return methods;
};