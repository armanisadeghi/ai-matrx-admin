// components/DirectoryTree/new/FileTree.tsx
'use client';

import React  from 'react';
import { useStorage } from '@/contexts/StorageContext';
import { cn } from '@/lib/utils';
import TreeNode from './TreeNode';

interface FileTreeProps {
    className?: string;
}

export default function FileTree({ className }: FileTreeProps) {
    const { currentItems, config } = useStorage();

    const sortedItems = React.useMemo(() => {
        let items = [...currentItems];
        const { sorting } = config;

        return items.sort((a, b) => {
            if (sorting.foldersFirst && a.isFolder !== b.isFolder) {
                return a.isFolder ? -1 : 1;
            }

            if (sorting.natural) {
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            }

            return a.name.localeCompare(b.name);
        });
    }, [currentItems, config]);

    const filteredItems = React.useMemo(() => {
        return sortedItems.filter(item => {
            if (config.filter.hideHiddenFiles && item.name.startsWith('.')) {
                return false;
            }
            return true;
        });
    }, [sortedItems, config.filter.hideHiddenFiles]);

    return (
        <div className={cn("min-h-[200px] p-2", className)}>
            {filteredItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    No items found
                </div>
            ) : (
                <div className="space-y-1">
                    {filteredItems.map((item) => (
                        <TreeNode
                            key={item.id || item.name}
                            item={item}
                            depth={1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}