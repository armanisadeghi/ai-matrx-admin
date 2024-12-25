// hooks/useFileSystemNavigation.ts
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

// hooks/useFileSystemNavigation.ts
interface UseFileSystemNavigationProps {
    fileSystemManager: FileSystemManager;
    structures: Map<string, BucketStructureWithNodes>;
    currentBucket: string | null;
    currentPath: string[];
    activeNode: NodeStructure | null;
    setCurrentBucket: React.Dispatch<React.SetStateAction<string | null>>;
    setCurrentPath: React.Dispatch<React.SetStateAction<string[]>>;
    setActiveNode: React.Dispatch<React.SetStateAction<NodeStructure | null>>;
}

export const useFileSystemNavigation = ({
    structures,
    currentBucket,
    setCurrentBucket,
    setCurrentPath,
    setActiveNode
}: UseFileSystemNavigationProps) => {


    const navigateToNode = useCallback((node: NodeStructure | null) => {
        if (!node) {
            setCurrentPath([]);
            setActiveNode(null);
            return;
        }

        const pathParts = node.path.split('/').filter(Boolean);
        setCurrentPath(pathParts);
        setActiveNode(node);
    }, [setCurrentPath, setActiveNode]);

    const findNodeByPath = (structure: BucketStructureWithNodes, path: string) => {
        if (!path) return null;

        const findNode = (nodes: NodeStructure[]): NodeStructure | null => {
            for (const node of nodes) {
                if (node.path === path) return node;
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findNode(structure.contents);
    };

    const navigateToPath = (path: string | string[]) => {
        const pathArray = typeof path === 'string'
            ? path.split('/').filter(Boolean)
            : path;

        if (!currentBucket || !structures.has(currentBucket)) {
            setCurrentPathState(pathArray);
            setActiveNode(null);
            return;
        }

        const structure = structures.get(currentBucket)!;
        const fullPath = pathArray.join('/');
        const node = findNodeByPath(structure, fullPath);

        setCurrentPathState(pathArray);
        setActiveNode(node);
    };

    const navigateUp = () => {
        if (!currentPath.length) return;

        const newPath = currentPath.slice(0, -1);
        if (!currentBucket || !structures.has(currentBucket)) {
            setCurrentPathState(newPath);
            setActiveNode(null);
            return;
        }

        const structure = structures.get(currentBucket)!;
        const fullPath = newPath.join('/');
        const node = fullPath ? findNodeByPath(structure, fullPath) : null;

        setCurrentPathState(newPath);
        setActiveNode(node);
    };

    const setCurrentBucket = (bucketName: string) => {
        setCurrentBucketState(bucketName);
        setCurrentPathState([]);
        setActiveNode(null);
    };

    const handlePathChange = (path: string[]) => {
        if (!currentBucket) {
            setCurrentPathState(path);
            setActiveNode(null);
            return;
        }
        navigateToPath(path);
    };

    const getFullPath = () => currentPath.join('/');

    const getParentPath = (path: string[]) => path.slice(0, -1);

    const getCurrentItemType = (): 'file' | 'folder' => {
        if (!currentBucket || !currentPath.length) return 'file';
        const structure = structures.get(currentBucket);
        if (!structure) return 'file';

        const currentItem = structure.contents.find(
            item => item.path === currentPath.join('/')
        );

        return currentItem?.type === 'FOLDER' ? 'folder' : 'file';
    };

    const getFolderStructure = () => {
        if (!currentBucket) return [];

        const structure = structures.get(currentBucket);
        if (!structure) return [];

        return structure.contents
            .filter(item => item.type === 'FOLDER')
            .map(folder => ({
                path: folder.path,
                name: folder.path.split('/').pop() || ''
            }))
            .sort((a, b) => a.path.localeCompare(b.path));
    };

    return {
        currentBucket,
        currentPath,
        activeNode,
        setCurrentBucket,
        setCurrentPath: handlePathChange,
        navigateToPath,
        navigateToNode,
        navigateUp,
        getFullPath,
        getParentPath,
        getCurrentItemType,
        getFolderStructure,
        findNodeByPath
    };
};