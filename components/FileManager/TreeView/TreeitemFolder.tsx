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
import { getFolderDetails } from "@/utils/file-operations";
import { FolderContextMenu } from '@/components/FileManager/ContextMenus/FolderContextMenu';

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

const TreeItemFolder: React.FC<BaseTreeItemProps> = ({
    name,
    path,
    level,
    isEmpty,
    bucketName,
    isExpanded,
    onToggle
}) => {
    const { navigateToPath, setCurrentBucket, setCurrentPath } = useFileSystem();
    const [menuOpen, setMenuOpen] = React.useState(false);

    const details = getFolderDetails(name);
    const IconComponent = details.icon;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigateToPath(path.split('/'));
        onToggle?.();
    };

    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle?.();
    };

    // Update folder context when opening menu
    const handleContextMenu = () => {
        setCurrentBucket(bucketName);
        setCurrentPath(path.split('/'));
    };

    return (
        <ContextMenu onOpenChange={setMenuOpen}>
            <ContextMenuTrigger>
                <div
                    className={cn(
                        'flex items-center py-1 px-2 rounded-sm cursor-pointer text-sm',
                        'hover:bg-accent',
                        menuOpen && 'bg-accent'
                    )}
                    style={{ paddingLeft: `${level * 16}px` }}
                    onClick={handleClick}
                    onContextMenu={handleContextMenu}
                >
                    <div className="flex items-center min-w-[24px]">
                        {!isEmpty && (
                            <button
                                onClick={handleChevronClick}
                                className="p-1 hover:bg-accent rounded-sm"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4"/>
                                ) : (
                                    <ChevronRight className="h-4 w-4"/>
                                )}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center">
                        <IconComponent className={cn('h-4 w-4 mr-2', details.color)}/>
                        <span className="truncate">{name}</span>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <FolderContextMenu
                    onClose={() => setMenuOpen(false)}
                    menuData={{ bucketName, path }}
                />
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default TreeItemFolder;