import React from 'react';
import {ContextMenuItem, ContextMenuSeparator} from "@/components/ui/context-menu";
import {
    RefreshCw,
    FolderPlus,
    Upload,
    Settings,
    FolderSync,
    Database,
    LucideIcon
} from 'lucide-react';
import {MenuData} from "@/providers/ContextMenuProvider";
import {useFileSystem} from "@/providers/FileSystemProvider";
import {useFileSystemDialog} from '@/components/FileManager/Dialogs/FileSystemDialogProvider';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    action: 'upload' | 'createFolder' | 'refresh' | 'sync' | 'settings' | 'properties';
    className?: string;
}

const BUCKET_MENU_ITEMS: MenuItem[] = [
    {icon: Upload, label: 'Upload files', action: 'upload'},
    {icon: FolderPlus, label: 'New folder', action: 'createFolder'},
    {icon: RefreshCw, label: 'Refresh bucket', action: 'refresh'},
    {icon: FolderSync, label: 'Force sync', action: 'sync'},
    {icon: Settings, label: 'Bucket settings', action: 'settings'},
    {icon: Database, label: 'Properties', action: 'properties'}
];

const BucketMenuItem: React.FC<{
    item: MenuItem;
    onComplete: () => void;
}> = ({item, onComplete}) => {
    const {
        uploadFilesToCurrentFolder,
        refreshBucketStructure,
        forceSyncBucket,
        currentBucket
    } = useFileSystem();
    const {openDialog} = useFileSystemDialog();

    const handleClick = async () => {
        if (!currentBucket) return;
        let success = true;

        switch (item.action) {
            case 'upload':
                success = await uploadFilesToCurrentFolder();
                break;
            case 'refresh':
                success = !!(await refreshBucketStructure(currentBucket));
                break;
            case 'sync':
                success = await forceSyncBucket(currentBucket);
                break;
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
        >
            <item.icon className="mr-2 h-4 w-4"/>
            {item.label}
        </ContextMenuItem>
    );
};

export const BucketContextMenu: React.FC<{
    menuData: MenuData;
    onClose: () => void;
}> = ({onClose}) => {
    return (
        <>
            {BUCKET_MENU_ITEMS.map((item, index) => (
                <React.Fragment key={item.action}>
                    {(index === 2 || index === 3 || index === 4) && <ContextMenuSeparator/>}
                    <BucketMenuItem
                        item={item}
                        onComplete={onClose}
                    />
                </React.Fragment>
            ))}
        </>
    );
};