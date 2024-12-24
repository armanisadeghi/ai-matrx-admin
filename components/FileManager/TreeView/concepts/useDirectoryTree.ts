import { useState, useMemo, useEffect } from 'react';
import { NodeStructure } from "@/utils/file-operations";
import { useFileSystem } from "@/providers/FileSystemProvider";
import { DirectoryTreeConfig } from '@/components/DirectoryTree/config';

export const useDirectoryTree = (config: DirectoryTreeConfig) => {
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const {
        currentBucket,
        activeNode,
        navigateToNode,
        getAllBucketStructures
    } = useFileSystem();

    const structures = getAllBucketStructures();

    const currentStructure = useMemo(() => {
        if (!currentBucket || !structures.has(currentBucket)) return null;
        return structures.get(currentBucket) || null;
    }, [structures, currentBucket]);

    useEffect(() => {
        if (activeNode?.path) {
            const pathParts = activeNode.path.split('/');
            const parentPaths = pathParts.reduce((acc: string[], part, index) => {
                if (index === 0) return [part];
                return [...acc, `${acc[index - 1]}/${part}`];
            }, [] as string[]);

            setExpandedPaths(prev => {
                const newPaths = new Set(prev);
                parentPaths.forEach(path => newPaths.add(path));
                return newPaths;
            });
        }
    }, [activeNode?.path]);

    const toggleFolder = (node: NodeStructure) => {
        setExpandedPaths(prev => {
            const newPaths = new Set(prev);
            if (newPaths.has(node.path)) {
                newPaths.delete(node.path);
            } else {
                newPaths.add(node.path);
            }
            return newPaths;
        });
    };

    const shouldShowNode = (node: NodeStructure): boolean => {
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            if (!node.name.toLowerCase().includes(searchLower)) {
                if (node.children) {
                    return node.children.some(child => shouldShowNode(child));
                }
                return false;
            }
        }

        const isHidden = node.name.startsWith('.');
        if (config.hideHiddenFiles && isHidden) return false;

        if (node.type !== 'FOLDER' && config.excludeFiles?.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(node.name);
            }
            return node.name === pattern;
        })) return false;

        if (node.type === 'FOLDER' && config.excludeDirs?.includes(node.name)) return false;

        return true;
    };

    const sortNodes = (nodes: NodeStructure[]): NodeStructure[] => {
        return [...nodes].sort((a, b) => {
            if (config.sortFoldersFirst) {
                if (a.type === 'FOLDER' && b.type !== 'FOLDER') return -1;
                if (b.type === 'FOLDER' && a.type !== 'FOLDER') return 1;
            }

            const aHidden = a.name.startsWith('.');
            const bHidden = b.name.startsWith('.');
            if (aHidden !== bHidden) {
                return aHidden ? 1 : -1;
            }

            return a.name.localeCompare(b.name);
        });
    };

    return {
        expandedPaths,
        searchTerm,
        setSearchTerm,
        currentStructure,
        activeNode,
        toggleFolder,
        navigateToNode,
        shouldShowNode,
        sortNodes
    };
};