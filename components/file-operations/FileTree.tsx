// components/file-operations/FileList.tsx
import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";
import { EnhancedDirectoryTree } from '../DirectoryTree/EnhancedDirectoryTree';
import { useMemo } from 'react';

interface FileTreeProps {
    explorer: UseStorageExplorerReturn;
}

export default function FileTree({ explorer }: FileTreeProps) {
    const {
        items,
        selectedItem,
        setSelectedItem,
        navigateToFolder,
        isLoading,
        currentPath,
        downloadItem,
        deleteItem,
        moveItem,
        copyItem,
        currentBucket,
    } = explorer;

    // Convert flat items array to tree structure
    const treeStructure = useMemo(() => {
        const tree: Record<string, any> = {};

        items.forEach(item => {
            if (item.isFolder) {
                // Create folder structure
                tree[item.name] = {}; // Empty object represents a folder
            } else {
                // Add file with metadata
                tree[item.name] = {
                    ...item,
                    type: 'file' // Explicitly mark as file
                };
            }
        });

        return tree;
    }, [items]);

    const handleSelect = (path: string) => {
        const selectedItem = items.find(item => item.name === path);
        if (selectedItem) {
            if (selectedItem.isFolder) {
                navigateToFolder(path);
            } else {
                setSelectedItem(selectedItem);
            }
        }
    };

    const handlePreview = (path: string) => {
        const item = items.find(item => item.name === path);
        if (item && !item.isFolder) {
            // Implement preview logic
            console.log('Preview:', path);
        }
    };

    const handleDownload = async (path: string) => {
        const item = items.find(item => item.name === path);
        if (item && !item.isFolder) {
            await downloadItem(item);
        }
    };

    const handleDelete = async (path: string) => {
        const item = items.find(item => item.name === path);
        if (item) {
            if (confirm(`Are you sure you want to delete ${path}?`)) {
                await deleteItem(item);
            }
        }
    };

    const handleCopy = async (path: string) => {
        const item = items.find(item => item.name === path);
        if (item) {
            // Implement copy logic
            console.log('Copy:', path);
        }
    };

    const handleRename = async (oldPath: string, newPath: string) => {
        const item = items.find(item => item.name === oldPath);
        if (item) {
            // Implement rename logic
            console.log('Rename:', oldPath, 'to', newPath);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Loading...
            </div>
        );
    }

    return (
        <EnhancedDirectoryTree
            structure={treeStructure}
            onSelect={handleSelect}
            config={{
                categorization: {
                    enabled: true,
                    groupByCategory: false,
                    showCategoryHeaders: true,
                },
                preview: {
                    enabled: true,
                },
                display: {
                    showSize: true,
                    showDate: true,
                    showIcons: true,
                    showExtensions: true,
                    compactMode: false,
                    indentSize: 24,

                },
                contextMenu: {
                    enabled: true,
                    actions: {
                        preview: true,
                        download: true,
                        copy: true,
                        delete: true,
                        rename: true,
                    },
                },
            }}
            title={`${currentBucket}${currentPath.length ? ': /' + currentPath.join('/') : ''}`}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onRename={handleRename}
            className="border-none shadow-none"
        />
    );
}