import React from 'react';
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Edit, FolderPlus, RefreshCw, Trash, Upload, LucideIcon } from 'lucide-react';
import { MenuData } from "@/providers/ContextMenuProvider";
import { useFileSystem } from "@/providers/FileSystemProvider";
import {useFileSystemDialog} from '@/components/FileManager/Dialogs/FileSystemDialogProvider';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    action: 'upload' | 'createFolder' | 'rename' | 'refresh' | 'delete';
    className?: string;
}

const FOLDER_MENU_ITEMS: MenuItem[] = [
    { icon: Upload, label: 'Upload files', action: 'upload' },
    { icon: FolderPlus, label: 'New folder', action: 'createFolder' },
    { icon: Edit, label: 'Rename', action: 'rename' },
    { icon: RefreshCw, label: 'Refresh', action: 'refresh' },
    { icon: Trash, label: 'Delete', action: 'delete', className: 'text-red-600' }
];

const FolderMenuItem: React.FC<{
    item: MenuItem;
    onComplete: () => void;
}> = ({ item, onComplete }) => {
    const { uploadFilesToCurrentFolder, refreshCurrentFolder } = useFileSystem();
    const { openDialog } = useFileSystemDialog();

    const handleClick = async () => {
        let success = true;

        switch (item.action) {
            case 'upload':
                success = await uploadFilesToCurrentFolder();
                break;
            case 'refresh':
                success = await refreshCurrentFolder();
                break;
            case 'createFolder':
            case 'rename':
            case 'delete':
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

export const FolderContextMenu: React.FC<{
    menuData: MenuData;
    onClose: () => void;
}> = ({ onClose }) => {
    return (
        <>
            {FOLDER_MENU_ITEMS.map((item, index) => (
                <React.Fragment key={item.action}>
                    {index === 2 && <ContextMenuSeparator />}
                    {index === 4 && <ContextMenuSeparator />}
                    <FolderMenuItem
                        item={item}
                        onComplete={onClose}
                    />
                </React.Fragment>
            ))}
        </>
    );
};