import React from 'react';
import { useDispatch } from 'react-redux';
import { ContextMenuItem, ContextMenuSeparator, ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { LucideIcon, Copy, Download, Edit, ExternalLink, Move, Trash, RefreshCw, FolderPlus, Upload, Settings, FolderSync, Database } from 'lucide-react';
import { useAppDispatch } from '@/lib/redux';

// Define action types for type safety
type FileSystemActionType = 
    | 'FILE_DOWNLOAD'
    | 'FILE_OPEN_TAB'
    | 'FILE_COPY'
    | 'FILE_MOVE'
    | 'FILE_RENAME'
    | 'FILE_DELETE'
    | 'FOLDER_UPLOAD'
    | 'FOLDER_CREATE'
    | 'FOLDER_REFRESH'
    | 'FOLDER_RENAME'
    | 'FOLDER_DELETE'
    | 'BUCKET_UPLOAD'
    | 'BUCKET_CREATE_FOLDER'
    | 'BUCKET_REFRESH'
    | 'BUCKET_SYNC'
    | 'BUCKET_SETTINGS'
    | 'BUCKET_PROPERTIES';

interface FileSystemAction {
    type: FileSystemActionType;
    payload: {
        path: string;
        bucketName: string;
        type: string;
        [key: string]: any;
    };
}

interface MenuItem {
    icon: LucideIcon;
    label: string;
    action: string;
    className?: string;
    availableFor: ('file' | 'folder' | 'bucket')[];
    actionType: FileSystemActionType;
}

const MENU_ITEMS: MenuItem[] = [
    // File operations
    { 
        icon: Download, 
        label: 'Download', 
        action: 'download', 
        actionType: 'FILE_DOWNLOAD',
        availableFor: ['file'] 
    },
    { 
        icon: ExternalLink, 
        label: 'Open in new tab', 
        action: 'openTab', 
        actionType: 'FILE_OPEN_TAB',
        availableFor: ['file'] 
    },
    { 
        icon: Copy, 
        label: 'Copy to...', 
        action: 'copy', 
        actionType: 'FILE_COPY',
        availableFor: ['file'] 
    },
    { 
        icon: Move, 
        label: 'Move to...', 
        action: 'move', 
        actionType: 'FILE_MOVE',
        availableFor: ['file'] 
    },
    
    // Common operations
    { 
        icon: Upload, 
        label: 'Upload files', 
        action: 'upload', 
        actionType: 'FOLDER_UPLOAD',
        availableFor: ['folder', 'bucket'] 
    },
    { 
        icon: FolderPlus, 
        label: 'New folder', 
        action: 'createFolder', 
        actionType: 'FOLDER_CREATE',
        availableFor: ['folder', 'bucket'] 
    },
    { 
        icon: Edit, 
        label: 'Rename', 
        action: 'rename', 
        actionType: 'FILE_RENAME',
        availableFor: ['file', 'folder'] 
    },
    { 
        icon: RefreshCw, 
        label: 'Refresh', 
        action: 'refresh', 
        actionType: 'FOLDER_REFRESH',
        availableFor: ['folder', 'bucket'] 
    },
    
    // Bucket-specific operations
    { 
        icon: FolderSync, 
        label: 'Force sync', 
        action: 'sync', 
        actionType: 'BUCKET_SYNC',
        availableFor: ['bucket'] 
    },
    { 
        icon: Settings, 
        label: 'Bucket settings', 
        action: 'settings', 
        actionType: 'BUCKET_SETTINGS',
        availableFor: ['bucket'] 
    },
    { 
        icon: Database, 
        label: 'Properties', 
        action: 'properties', 
        actionType: 'BUCKET_PROPERTIES',
        availableFor: ['bucket'] 
    },
    
    // Destructive operations
    { 
        icon: Trash, 
        label: 'Delete', 
        action: 'delete', 
        actionType: 'FILE_DELETE',
        className: 'text-red-600', 
        availableFor: ['file', 'folder'] 
    }
];

// Helper functions for menu organization
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
    menuData: {
        path: string;
        bucketName: string;
        type: string;
    };
    onComplete: () => void;
}

const UnifiedMenuItem: React.FC<UnifiedMenuItemProps> = ({ item, menuData, onComplete }) => {
    const dispatch = useAppDispatch;

    const handleClick = () => {
        // Create action with menu data as payload
        const action: FileSystemAction = {
            type: item.actionType,
            payload: {
                ...menuData,
                action: item.action
            }
        };

        // @ts-ignore
        dispatch(action);
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
    menuData: {
        path: string;
        bucketName: string;
        type: string;
    };
    children: React.ReactNode;
}

export const UnifiedContextMenu: React.FC<UnifiedContextMenuProps> = ({
    type,
    menuData,
    children
}) => {
    const filteredItems = MENU_ITEMS.filter(item => item.availableFor.includes(type));

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