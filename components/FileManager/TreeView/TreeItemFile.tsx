'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileContextMenu } from '@/components/FileManager/ContextMenus/FileContextMenu';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { getFileDetails } from "@/utils/file-operations";

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

const TreeItemFile: React.FC<BaseTreeItemProps> = ({
    name,
    path,
    level,
    extension,
    bucketName
}) => {
    const { downloadCurrentFile, navigateToPath, setCurrentBucket, setCurrentPath } = useFileSystem();
    const [menuOpen, setMenuOpen] = React.useState(false);

    const details = getFileDetails(extension);
    const IconComponent = details.icon;

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const pathParts = path.split('/');
        navigateToPath(pathParts.slice(0, -1));
        await downloadCurrentFile();
    };

    // Update current file context when opening menu
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
                    <div className="flex items-center min-w-[24px]"/>
                    <div className="flex items-center">
                        <IconComponent className={cn('h-4 w-4 mr-2', details.color)}/>
                        <span className="truncate">{name}</span>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <FileContextMenu
                    onClose={() => setMenuOpen(false)}
                    menuData={{ bucketName, path }}
                />
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default TreeItemFile;