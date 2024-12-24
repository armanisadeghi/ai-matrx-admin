'use client';

import React from 'react';
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import {
    Copy, Download, Edit, ExternalLink, Move, Trash, Upload,
    FolderPlus, RefreshCw, Settings, FolderSync, Database,
    LucideIcon
} from 'lucide-react';
import { useFileSystem } from "@/providers/FileSystemProvider";
import { useFileSystemDialog } from '@/components/FileManager/Dialogs/FileSystemDialogProvider';

type MenuItemAction =
    | 'download' | 'openTab' | 'copy' | 'move' | 'rename' | 'delete'
    | 'upload' | 'createFolder' | 'refresh' | 'sync' | 'settings' | 'properties';

type ContentType = 'FILE' | 'FOLDER' | 'BUCKET';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    action: MenuItemAction;
    className?: string;
    availableFor: ContentType[];
    separator?: 'before' | 'after';
    disabled?: (context: any) => boolean;
}

const MENU_ITEMS: MenuItem[] = [
    // File operations
    {
        icon: Download,
        label: 'Download',
        action: 'download',
        availableFor: ['FILE']
    },
    {
        icon: ExternalLink,
        label: 'Open in new tab',
        action: 'openTab',
        availableFor: ['FILE'],
        separator: 'after'
    },
    {
        icon: Copy,
        label: 'Copy to...',
        action: 'copy',
        availableFor: ['FILE']
    },
    {
        icon: Move,
        label: 'Move to...',
        action: 'move',
        availableFor: ['FILE']
    },

    // Common operations
    {
        icon: Upload,
        label: 'Upload files',
        action: 'upload',
        availableFor: ['FOLDER', 'BUCKET']
    },
    {
        icon: FolderPlus,
        label: 'New folder',
        action: 'createFolder',
        availableFor: ['FOLDER', 'BUCKET'],
        separator: 'after'
    },
    {
        icon: Edit,
        label: 'Rename',
        action: 'rename',
        availableFor: ['FILE', 'FOLDER']
    },
    {
        icon: RefreshCw,
        label: 'Refresh',
        action: 'refresh',
        availableFor: ['FOLDER', 'BUCKET'],
        separator: 'after'
    },

    // Bucket-specific operations
    {
        icon: FolderSync,
        label: 'Force sync',
        action: 'sync',
        availableFor: ['BUCKET'],
        separator: 'after'
    },
    {
        icon: Settings,
        label: 'Bucket settings',
        action: 'settings',
        availableFor: ['BUCKET'],
        separator: 'after'
    },
    {
        icon: Database,
        label: 'Properties',
        action: 'properties',
        availableFor: ['BUCKET']
    },

    // Dangerous operations
    {
        icon: Trash,
        label: 'Delete',
        action: 'delete',
        availableFor: ['FILE', 'FOLDER'],
        className: 'text-red-600',
        separator: 'before'
    }
];

const FileSystemMenuItem: React.FC<{
    item: MenuItem;
    contentType: ContentType;
    onComplete: () => void;
}> = ({ item, contentType, onComplete }) => {
    const {
        downloadFile, openInNewTab, uploadFilesToCurrentFolder,
        refreshCurrentFolder, refreshBucketStructure,
        forceSyncBucket, currentBucket
    } = useFileSystem();

    const { openDialog } = useFileSystemDialog();

    const handleClick = async () => {
        let success = true;

        switch (item.action) {
            // File operations
            case 'download':
                success = await downloadFile();
                break;
            case 'openTab':
                success = await openInNewTab();
                break;

            // Common operations
            case 'upload':
                success = await uploadFilesToCurrentFolder();
                break;
            case 'refresh':
                success = contentType === 'BUCKET' && currentBucket
                    ? !!(await refreshBucketStructure(currentBucket))
                    : await refreshCurrentFolder();
                break;

            // Bucket operations
            case 'sync':
                if (currentBucket) {
                    success = await forceSyncBucket(currentBucket);
                }
                break;

            // Dialog operations
            case 'copy':
            case 'move':
            case 'rename':
            case 'delete':
            case 'createFolder':
            case 'settings':
            case 'properties':
                openDialog(item.action);
                break;
        }

        if (success) onComplete();
    };

    return (
        <ContextMenuItem
            onClick={handleClick}
            className={item.className}
            disabled={item.disabled?.({}) ?? false}
        >
            <item.icon className="mr-2 h-4 w-4"/>
            {item.label}
        </ContextMenuItem>
    );
};

export const FileSystemContextMenu: React.FC<{
    contentType: ContentType;
    onClose: () => void;
}> = ({ contentType, onClose }) => {
    const availableItems = MENU_ITEMS.filter(item =>
        item.availableFor.includes(contentType)
    );

    return (
        <>
            {availableItems.map((item, index) => (
                <React.Fragment key={item.action}>
                    {item.separator === 'before' && <ContextMenuSeparator />}
                    <FileSystemMenuItem
                        item={item}
                        contentType={contentType}
                        onComplete={onClose}
                    />
                    {item.separator === 'after' && <ContextMenuSeparator />}
                </React.Fragment>
            ))}
        </>
    );
};