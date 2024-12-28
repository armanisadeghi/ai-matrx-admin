import React from 'react';
import { ContextMenuItem, ContextMenuSeparator, ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { LucideIcon, Copy, Download, Edit, ExternalLink, Move, Trash, RefreshCw, FolderPlus, Upload, Settings, FolderSync, Database } from 'lucide-react';
import { useFileSystem } from "@/providers/FileSystemProvider";
import { useFileSystemDialog } from '@/components/FileManager/Dialogs/FileSystemDialogProvider';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    action: string;
    className?: string;
    availableFor: ('file' | 'folder' | 'bucket')[];
}

const MENU_ITEMS: MenuItem[] = [
    // File operations
    { icon: Download, label: 'Download', action: 'download', availableFor: ['file'] },
    { icon: ExternalLink, label: 'Open in new tab', action: 'openTab', availableFor: ['file'] },
    { icon: Copy, label: 'Copy to...', action: 'copy', availableFor: ['file'] },
    { icon: Move, label: 'Move to...', action: 'move', availableFor: ['file'] },
    
    // Common operations
    { icon: Upload, label: 'Upload files', action: 'upload', availableFor: ['folder', 'bucket'] },
    { icon: FolderPlus, label: 'New folder', action: 'createFolder', availableFor: ['folder', 'bucket'] },
    { icon: Edit, label: 'Rename', action: 'rename', availableFor: ['file', 'folder'] },
    { icon: RefreshCw, label: 'Refresh', action: 'refresh', availableFor: ['folder', 'bucket'] },
    
    // Bucket-specific operations
    { icon: FolderSync, label: 'Force sync', action: 'sync', availableFor: ['bucket'] },
    { icon: Settings, label: 'Bucket settings', action: 'settings', availableFor: ['bucket'] },
    { icon: Database, label: 'Properties', action: 'properties', availableFor: ['bucket'] },
    
    // Destructive operations
    { icon: Trash, label: 'Delete', action: 'delete', className: 'text-red-600', availableFor: ['file', 'folder'] }
];

// Helper function to determine if a separator should be added
const shouldAddSeparator = (currentItem: MenuItem, nextItem: MenuItem | undefined): boolean => {
    if (!nextItem) return false;
    
    const currentCategory = getItemCategory(currentItem);
    const nextCategory = getItemCategory(nextItem);
    return currentCategory !== nextCategory;
};

// Helper function to get item category for separator logic
const getItemCategory = (item: MenuItem): string => {
    if (item.action === 'delete') return 'destructive';
    if (['sync', 'settings', 'properties'].includes(item.action)) return 'bucket-specific';
    if (['download', 'openTab', 'copy', 'move'].includes(item.action)) return 'file-specific';
    return 'common';
};

interface UnifiedMenuItemProps {
    item: MenuItem;
    onComplete: () => void;
    currentBucket?: string;
}

const UnifiedMenuItem: React.FC<UnifiedMenuItemProps> = ({ item, onComplete, currentBucket }) => {
    const { 
        downloadFile, 
        openInNewTab, 
        uploadFilesToCurrentFolder, 
        refreshCurrentFolder,
        refreshBucketStructure,
        forceSyncBucket 
    } = useFileSystem();
    const { openDialog } = useFileSystemDialog();

    const handleClick = async () => {
        let success = true;

        switch (item.action) {
            case 'download':
                success = await downloadFile();
                break;
            case 'openTab':
                success = await openInNewTab();
                break;
            case 'upload':
                success = await uploadFilesToCurrentFolder();
                break;
            case 'refresh':
                if (currentBucket && item.availableFor.includes('bucket')) {
                    success = !!(await refreshBucketStructure(currentBucket));
                } else {
                    success = await refreshCurrentFolder();
                }
                break;
            case 'sync':
                if (currentBucket) {
                    success = await forceSyncBucket(currentBucket);
                }
                break;
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
                            onComplete={() => {}}
                            currentBucket={menuData.bucketName}
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