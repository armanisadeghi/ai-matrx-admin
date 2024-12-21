// components/DirectoryTree/new/TreeNode.tsx
'use client';

import React, { useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { StorageItem } from '@/utils/supabase/StorageBase';
import { useStorage } from '@/contexts/StorageContext';
import { cn } from '@/lib/utils';

interface TreeNodeProps {
    item: StorageItem;
    depth: number;
}

const TreeNode = React.memo(({ item, depth }: TreeNodeProps) => {
    const {
        selectedItem,
        setSelectedItem,
        navigateToFolder,
        fileTypeManager,
        currentPath,
    } = useStorage();

    const handleClick = useCallback(async () => {
        if (item.isFolder) {
            await navigateToFolder([...currentPath, item.name]);
        }
        setSelectedItem(item);
    }, [item, navigateToFolder, currentPath, setSelectedItem]);

    const typeInfo = fileTypeManager.getItemTypeInfo(item);
    const Icon = typeInfo.icon as React.ComponentType<{ className?: string }>;

    return (
        <div
            className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer",
                "hover:bg-accent/50 transition-colors",
                selectedItem?.id === item.id && "bg-accent",
            )}
            style={{ paddingLeft: `${depth * 16}px` }}
            onClick={handleClick}
        >
            {item.isFolder && (
                currentPath.includes(item.name) ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                )
            )}
            <Icon className={cn("h-4 w-4 shrink-0", typeInfo.color)} />
            <span className="truncate">{item.name}</span>
        </div>
    );
});

TreeNode.displayName = 'TreeNode';

export default TreeNode;