import React from 'react';
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Copy, Download, Edit, ExternalLink, Move, Trash, LucideIcon } from 'lucide-react';
import { MenuData } from "@/providers/ContextMenuProvider";
import { useFileSystem } from "@/providers/FileSystemProvider";
import {useFileSystemDialog} from '@/components/FileManager/Dialogs/FileSystemDialogProvider';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    action: 'download' | 'openTab' | 'copy' | 'move' | 'rename' | 'delete';
    className?: string;
}

const MENU_ITEMS: MenuItem[] = [
    { icon: Download, label: 'Download', action: 'download' },
    { icon: ExternalLink, label: 'Open in new tab', action: 'openTab' },
    { icon: Copy, label: 'Copy to...', action: 'copy' },
    { icon: Move, label: 'Move to...', action: 'move' },
    { icon: Edit, label: 'Rename', action: 'rename' },
    { icon: Trash, label: 'Delete', action: 'delete', className: 'text-red-600' }
];

const FileMenuItem: React.FC<{
    item: MenuItem;
    onComplete: () => void;
}> = ({ item, onComplete }) => {
    const { downloadCurrentFile, openInNewTab } = useFileSystem();
    const { openDialog } = useFileSystemDialog();

    const handleClick = async () => {
        let success = true;

        switch (item.action) {
            case 'download':
                success = await downloadCurrentFile();
                break;
            case 'openTab':
                success = await openInNewTab();
                break;
            case 'copy':
            case 'move':
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

export const FileContextMenu: React.FC<{
    menuData: MenuData;
    onClose: () => void;
}> = ({ onClose }) => {
    return (
        <>
            {MENU_ITEMS.map((item, index) => (
                <React.Fragment key={item.action}>
                    {index === 2 || index === 5 && <ContextMenuSeparator />}
                    <FileMenuItem
                        item={item}
                        onComplete={onClose}
                    />
                </React.Fragment>
            ))}
        </>
    );
};