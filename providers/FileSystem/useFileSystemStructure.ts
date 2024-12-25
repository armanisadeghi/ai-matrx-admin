// hooks/useFileSystemStructure.ts
import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
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



interface UseFileSystemStructureProps {
    fileSystemManager: FileSystemManager;
    isInitialized: boolean;
    currentBucket: string | null;
    structures: Map<string, BucketStructureWithNodes>;
    setStructures: React.Dispatch<React.SetStateAction<Map<string, BucketStructureWithNodes>>>;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useFileSystemStructure = ({
    fileSystemManager,
    isInitialized,
    currentBucket,
    structures,
    setStructures,
    setIsLoading
}: UseFileSystemStructureProps) => {


    const updateStructures = useCallback((
        bucketName: string,
        newStructure: BucketStructureWithNodes
    ) => {
        setStructures(prev => new Map(prev).set(bucketName, newStructure));
    }, []);

    const getBucketStructure = useCallback((bucketName: string) => {
        if (!isInitialized) return undefined;
        return structures.get(bucketName);
    }, [isInitialized, structures]);




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

    const getAllBucketStructures = (): Map<string, BucketStructureWithNodes> => {
        if (!isInitialized) return new Map();

        if (structures.size === 0) {
            const rawStructures = fileSystemManager.getAllBucketStructures();
            const processedStructures = fileSystemManager.processAllBucketStructures(rawStructures);
            setStructures(processedStructures);
            return processedStructures;
        }

        return structures;
    };

    const getBucketStructure = (bucketName: string): BucketStructureWithNodes | undefined => {
        if (!isInitialized) return undefined;

        const structureFromState = structures.get(bucketName);
        if (structureFromState) return structureFromState;

        const rawStructure = fileSystemManager.getBucketStructure(bucketName);
        if (rawStructure) {
            const processedStructure = fileSystemManager.processBucketStructure(rawStructure);
            setStructures(prev => new Map(prev).set(bucketName, processedStructure));
            return processedStructure;
        }

        return undefined;
    };

    const refreshBucketStructure = async (bucketName: string) => {
        return withLoadingAndToast(
            async () => {
                if (!isInitialized) return undefined;
                const structure = await fileSystemManager.loadBucketStructure(bucketName);
                if (!structure || !structure.contents) return undefined;
                const processedStructure = fileSystemManager.processBucketStructure(structure);
                updateStructures(bucketName, processedStructure);
                return processedStructure;
            },
            'Bucket structure refreshed',
            'Failed to refresh bucket structure'
        );
    };

    const updateFolderContentsInStructure = (
        structure: BucketStructureWithNodes,
        folderPath: string,
        newContents: NodeStructure[]
    ) => {
        const updateNode = (node: NodeStructure): NodeStructure => {
            if (node.path === folderPath) {
                return {
                    ...node,
                    children: newContents,
                    isEmpty: newContents.length === 0
                };
            }
            if (node.children) {
                return {
                    ...node,
                    children: node.children.map(updateNode)
                };
            }
            return node;
        };

        return {
            ...structure,
            contents: structure.contents.map(updateNode)
        };
    };

    const refreshFolderContents = async (bucketName: string, folderPath: string) => {
        return withLoadingAndToast(
            async () => {
                if (!isInitialized) return false;

                const success = await fileSystemManager.refreshFolderContents(bucketName, folderPath);
                if (!success) return false;

                const currentStructure = structures.get(bucketName);
                if (!currentStructure) return false;

                const folderContents = {
                    path: folderPath,
                    contents: currentStructure.contents.filter(item =>
                        item.path.startsWith(folderPath + '/') || item.path === folderPath
                    )
                };

                const processedContents = fileSystemManager.processFolderContents(folderContents, bucketName);
                const updatedStructure = {
                    ...currentStructure,
                    contents: currentStructure.contents.map(item => {
                        if (item.path.startsWith(folderPath + '/') || item.path === folderPath) {
                            const matchingNode = processedContents.contents.find(
                                node => node.path === item.path
                            );
                            return matchingNode || item;
                        }
                        return item;
                    })
                };

                updateStructures(bucketName, updatedStructure);
                return true;
            },
            'Folder contents refreshed',
            'Failed to refresh folder contents'
        );
    };

    return {
        structures,
        isLoading,
        getAllBucketStructures,
        getBucketStructure,
        refreshBucketStructure,
        refreshFolderContents,
        updateFolderContentsInStructure,
        updateStructures
    };
};