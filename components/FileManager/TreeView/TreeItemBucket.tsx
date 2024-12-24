'use client';

import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useFileSystem } from '@/providers/FileSystemProvider';
import { getBucketDetails } from "@/utils/file-operations";
import { BucketContextMenu } from '@/components/FileManager/ContextMenus/BucketContextMenu';

interface BaseTreeItemProps {
    name: string;
    path: string;
    level: number;
    contentType: 'BUCKET' | 'FOLDER' | 'FILE';
    extension: string;
    isEmpty: boolean;
    bucketName: string;
    isExpanded?: boolean;
    onToggle?: () => void;
}

const TreeBucketItem: React.FC<BaseTreeItemProps> = ({
    name,
    path,
    level,
    isEmpty,
    isExpanded,
    onToggle
}) => {
    const { setCurrentBucket, setCurrentPath } = useFileSystem();
    const [menuOpen, setMenuOpen] = React.useState(false);

    const details = getBucketDetails(name);
    const IconComponent = details.icon;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentBucket(path);
        setCurrentPath([]);
        onToggle?.();
    };

    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle?.();
    };

    // Update bucket context when opening menu
    const handleContextMenu = () => {
        setCurrentBucket(path);
        setCurrentPath([]);
    };

    return (
        <ContextMenu onOpenChange={setMenuOpen}>
            <ContextMenuTrigger>
                <div
                    className={cn(
                        'flex items-center py-1 px-2 hover:bg-accent rounded-sm cursor-pointer',
                        'text-sm',
                        menuOpen && 'bg-accent'
                    )}
                    style={{ paddingLeft: `${level * 16}px` }}
                    onClick={handleClick}
                    onContextMenu={handleContextMenu}
                >
                    <div className="flex items-center min-w-[24px]">
                        {isEmpty ? (
                            <div className="w-8 h-8"/> // Placeholder with same dimensions as button
                        ) : (
                            <button
                                onClick={handleChevronClick}
                                className="p-1 hover:bg-accent rounded-sm"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-6 w-6"/>
                                ) : (
                                    <ChevronRight className="h-6 w-6"/>
                                )}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center">
                        <IconComponent className={cn('h-6 w-6 mr-2', details.color)}/>
                        <span className="truncate">{name}</span>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <BucketContextMenu
                    menuData={{ bucketName: path }}
                    onClose={() => setMenuOpen(false)}
                />
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default TreeBucketItem;