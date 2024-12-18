// components/DirectoryTree/DirectoryItemRenderers.tsx
import React from 'react';
import {
    ChevronDown,
    ChevronRight,
    Folder,
    Eye,
    Trash,
    Copy,
    Download,
    Pencil,
    Calendar
} from 'lucide-react';
import {Badge} from "@/components/ui/badge";
import {formatFileSize, formatLastModified} from '../file-operations/utils';
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from '../ui';
import {getEnhancedFileIcon, getFileCategory} from './config';
import type {EnhancedDirectoryTreeConfig} from './config';

export const renderItemMetadata = (item: any, name: string, finalConfig: EnhancedDirectoryTreeConfig) => {
    if (!finalConfig.display.showSize && !finalConfig.display.showDate) return null;
    if (!item) return null;

    return (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {finalConfig.display.showSize && typeof item.size !== 'undefined' && (
                <span>{formatFileSize(item.size)}</span>
            )}
            {finalConfig.display.showDate && item.modifiedAt && (
                <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1"/>
                    {formatLastModified(item.modifiedAt)}
                </span>
            )}
            {finalConfig.categorization.enabled && (
                <Badge variant="outline" className="text-xs">
                    {getFileCategory(name)}
                </Badge>
            )}
        </div>
    );
};

interface RenderContextMenuProps {
    path: string;
    isDirectory: boolean;
    item: any;
    finalConfig: EnhancedDirectoryTreeConfig;
    onPreview?: (path: string) => void;
    onDownload?: (path: string) => void;
    onCopy?: (path: string) => void;
    onDelete?: (path: string) => void;
    onStartRename?: (path: string) => void;
    children: React.ReactNode;
}

export const renderContextMenu = (
    {
        path,
        isDirectory,
        item,
        finalConfig,
        onPreview,
        onDownload,
        onCopy,
        onDelete,
        onStartRename,
        children
    }: RenderContextMenuProps) => {
    if (!finalConfig.contextMenu?.enabled) return children;
    const actions = finalConfig.contextMenu.actions;

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent onClick={(e) => e.stopPropagation()}>
                {!isDirectory && actions.preview && onPreview && (
                    <ContextMenuItem onClick={(e) => handleAction(e, () => onPreview(path))}>
                        <Eye className="w-4 h-4 mr-2"/>
                        Preview
                    </ContextMenuItem>
                )}
                {!isDirectory && actions.download && onDownload && (
                    <ContextMenuItem onClick={(e) => handleAction(e, () => onDownload(path))}>
                        <Download className="w-4 h-4 mr-2"/>
                        Download
                    </ContextMenuItem>
                )}
                {actions.copy && onCopy && (
                    <ContextMenuItem onClick={(e) => handleAction(e, () => onCopy(path))}>
                        <Copy className="w-4 h-4 mr-2"/>
                        Copy
                    </ContextMenuItem>
                )}
                {onStartRename && (
                    <ContextMenuItem onClick={(e) => handleAction(e, () => onStartRename(path))}>
                        <Pencil className="w-4 h-4 mr-2"/>
                        Rename
                    </ContextMenuItem>
                )}
                {actions.delete && onDelete && (
                    <ContextMenuItem
                        onClick={(e) => handleAction(e, () => onDelete(path))}
                        className="text-destructive"
                    >
                        <Trash className="w-4 h-4 mr-2"/>
                        Delete
                    </ContextMenuItem>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};


export const renderItemContent = (
    path: string,
    isDirectory: boolean,
    item: any,
    expanded: Record<string, boolean>,
    finalConfig: EnhancedDirectoryTreeConfig
) => {
    const IconComponent = isDirectory ? Folder : getEnhancedFileIcon(path);

    return (
        <div className="flex items-center space-x-2 min-w-0">
            {isDirectory && (
                expanded[path]
                    ? <ChevronDown className="w-4 h-4 flex-shrink-0"/>
                    : <ChevronRight className="w-4 h-4 flex-shrink-0"/>
            )}
            {IconComponent && (
                <IconComponent
                    className={`
                    w-4 h-4 flex-shrink-0
                    ${isDirectory ? 'text-primary ml-1' : 'ml-6'} mr-2
                `}
                />
            )}
            <span className="truncate">
                {finalConfig.display.showExtensions
                    ? path.split('/').pop()
                    : path.split('/').pop()?.split('.')[0]}
            </span>
            {renderItemMetadata(item, path, finalConfig)}
        </div>
    );
};