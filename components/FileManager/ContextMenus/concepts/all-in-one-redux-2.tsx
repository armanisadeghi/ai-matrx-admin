import React from 'react';
import { useDispatch } from 'react-redux';
import { ContextMenuItem, ContextMenuSeparator, ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { LucideIcon, Copy, Download, Edit, ExternalLink, Move, Trash, RefreshCw, FolderPlus, Upload, Settings, FolderSync, Database, FileIcon } from 'lucide-react';
import { useDialog } from '@/providers/dialogs/DialogContext';
import { FileSystemActionTypes } from '@/lib/redux/fileSystem/types';

type ActionType = keyof FileSystemActionTypes;

interface ActionConfig {
    type: 'dialog' | 'dispatch' | 'custom';
    action: ActionType;
    dialogId?: string;
    customHandler?: (menuData: MenuData) => Promise<void> | void;
}

interface MenuData {
    path: string;
    bucketName: string;
    type: string;
    [key: string]: any;
}

interface MenuItem {
    icon: LucideIcon;
    label: string;
    action: string;
    className?: string;
    availableFor: ('file' | 'folder' | 'bucket')[];
    config: ActionConfig;
}

const MENU_ITEMS: MenuItem[] = [
    // File operations
    { 
        icon: Download, 
        label: 'Download', 
        action: 'download', 
        availableFor: ['file'],
        config: {
            type: 'dispatch',
            action: 'downloadFile'  // Updated to match actual action name
        }
    },
    { 
        icon: ExternalLink, 
        label: 'Open in new tab', 
        action: 'openTab', 
        availableFor: ['file'],
        config: {
            type: 'dispatch',
            action: 'getPublicFile'  // Updated to match actual action name
        }
    },
    { 
        icon: Copy, 
        label: 'Copy to...', 
        action: 'copy', 
        availableFor: ['file'],
        config: {
            type: 'dialog',
            action: 'uploadFile',  // Updated to match actual action name
            dialogId: 'filesystem.copy'
        }
    },
    { 
        icon: Move, 
        label: 'Move to...', 
        action: 'move', 
        availableFor: ['file'],
        config: {
            type: 'dialog',
            action: 'moveFiles',  // Updated to match actual action name
            dialogId: 'filesystem.move'
        }
    },
    { 
        icon: Upload, 
        label: 'Upload files', 
        action: 'upload', 
        availableFor: ['folder', 'bucket'],
        config: {
            type: 'dialog',
            action: 'uploadFile',  // Updated to match actual action name
            dialogId: 'filesystem.upload'
        }
    },
    { 
        icon: FolderPlus, 
        label: 'New folder', 
        action: 'createFolder', 
        availableFor: ['folder', 'bucket'],
        config: {
            type: 'dialog',
            action: 'createFolder',
            dialogId: 'filesystem.createFolder'
        }
    },
    { 
        icon: FileIcon, 
        label: 'New file', 
        action: 'createFile', 
        availableFor: ['folder', 'bucket'],
        config: {
            type: 'dialog',
            action: 'createFile',
            dialogId: 'filesystem.createFile'
        }
    },
    { 
        icon: Edit, 
        label: 'Rename', 
        action: 'rename', 
        availableFor: ['file', 'folder'],
        config: {
            type: 'dialog',
            action: 'renameActiveNode',  // Updated to match new action
            dialogId: 'filesystem.rename'
        }
    },
    { 
        icon: RefreshCw, 
        label: 'Refresh', 
        action: 'refresh', 
        availableFor: ['folder', 'bucket'],
        config: {
            type: 'dispatch',
            action: 'listContents'  // Updated to match actual action name
        }
    },
    { 
        icon: FolderSync, 
        label: 'Force sync', 
        action: 'sync', 
        availableFor: ['bucket'],
        config: {
            type: 'dispatch',
            action: 'syncNode'  // Updated to match actual action name
        }
    },
    { 
        icon: Settings, 
        label: 'Bucket settings', 
        action: 'settings', 
        availableFor: ['bucket'],
        config: {
            type: 'dialog',
            action: 'updateNode',  // Updated to match actual action name
            dialogId: 'filesystem.bucketSettings'
        }
    },
    { 
        icon: Database, 
        label: 'Properties', 
        action: 'properties', 
        availableFor: ['bucket'],
        config: {
            type: 'dialog',
            action: 'syncNode',  // Updated to match actual action name
            dialogId: 'filesystem.properties'
        }
    },
    { 
        icon: Trash, 
        label: 'Delete', 
        action: 'delete', 
        className: 'text-red-600', 
        availableFor: ['file', 'folder'],
        config: {
            type: 'dialog',
            action: 'deleteActiveNode',  // Updated to match new action
            dialogId: 'filesystem.delete'
        }
    }
];

// Helper functions remain the same
const shouldAddSeparator = (currentItem: MenuItem, nextItem: MenuItem | undefined): boolean => {
    if (!nextItem) return false;
    const currentCategory = getItemCategory(currentItem);
    const nextCategory = getItemCategory(nextItem);
    return currentCategory !== nextCategory;
};

const getItemCategory = (item: MenuItem): string => {
    if (item.action === 'delete') return 'destructive';
    if (['sync', 'settings', 'properties'].includes(item.action)) return 'bucket-specific';
    if (['download', 'openTab', 'copy', 'move'].includes(item.action)) return 'file-specific';
    return 'common';
};

interface UnifiedMenuItemProps {
    item: MenuItem;
    menuData: MenuData;
    onComplete: () => void;
}

const UnifiedMenuItem: React.FC<UnifiedMenuItemProps> = ({ item, menuData, onComplete }) => {
    const dispatch = useDispatch();
    const { openDialog } = useDialog();

    const handleClick = async () => {
        const { config } = item;

        try {
            switch (config.type) {
                case 'dispatch':
                    dispatch({
                        type: config.action,
                        payload: menuData
                    });
                    break;

                case 'dialog':
                    if (!config.dialogId) {
                        console.error(`No dialogId provided for dialog action: ${item.action}`);
                        return;
                    }
                    openDialog(config.dialogId, {
                        ...menuData,
                        onSuccess: () => {
                            // Optionally dispatch an action after dialog success
                            dispatch({
                                type: config.action,
                                payload: menuData
                            });
                            onComplete();
                        }
                    });
                    break;

                case 'custom':
                    if (config.customHandler) {
                        await config.customHandler(menuData);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling menu action:', error);
        }

        onComplete();
    };

    return (
        <ContextMenuItem onClick={handleClick} className={item.className}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
        </ContextMenuItem>
    );
};

interface UnifiedContextMenuProps {
    type: 'bucket' | 'folder' | 'file';
    menuData: MenuData;
    children: React.ReactNode;
    customHandlers?: Record<string, (menuData: MenuData) => Promise<void> | void>;
}

export const UnifiedContextMenu: React.FC<UnifiedContextMenuProps> = ({
    type,
    menuData,
    children,
    customHandlers = {}
}) => {
    const filteredItems = MENU_ITEMS.filter(item => item.availableFor.includes(type))
        .map(item => ({
            ...item,
            config: item.config.type === 'custom' && customHandlers[item.action]
                ? { ...item.config, customHandler: customHandlers[item.action] }
                : item.config
        }));

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent>
                {filteredItems.map((item, index) => (
                    <React.Fragment key={item.action}>
                        <UnifiedMenuItem
                            item={item}
                            menuData={menuData}
                            onComplete={() => {}}
                        />
                        {shouldAddSeparator(item, filteredItems[index + 1]) && (
                            <ContextMenuSeparator />
                        )}
                    </React.Fragment>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
};