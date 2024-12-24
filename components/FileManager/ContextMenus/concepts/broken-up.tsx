import React from 'react';
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Copy, Download, Edit, ExternalLink, Move, Trash } from 'lucide-react';
import { MenuData } from "@/providers/ContextMenuProvider";
import { useFileSystem } from "@/providers/FileSystemProvider";
import {useFileSystemDialog} from '@/components/FileManager/Dialogs/FileSystemDialogProvider';

interface MenuItemProps {
    onComplete: () => void;
}

const DownloadMenuItem: React.FC<MenuItemProps> = ({ onComplete }) => {
    const { downloadFile } = useFileSystem();

    const handleClick = async () => {
        const success = await downloadFile();
        if (success) onComplete();
    };

    return (
        <ContextMenuItem onClick={handleClick}>
            <Download className="mr-2 h-4 w-4"/>
            Download
        </ContextMenuItem>
    );
};

const OpenInNewTabMenuItem: React.FC<MenuItemProps> = ({ onComplete }) => {
    const { openInNewTab } = useFileSystem();

    const handleClick = async () => {
        const success = await openInNewTab();
        if (success) onComplete();
    };

    return (
        <ContextMenuItem onClick={handleClick}>
            <ExternalLink className="mr-2 h-4 w-4"/>
            Open in new tab
        </ContextMenuItem>
    );
};

const CopyMenuItem: React.FC<MenuItemProps> = ({ onComplete }) => {
    const { openDialog } = useFileSystemDialog();

    return (
        <ContextMenuItem onClick={() => {
            openDialog('move');
            onComplete();
        }}>
            <Copy className="mr-2 h-4 w-4"/>
            Copy to...
        </ContextMenuItem>
    );
};

const MoveMenuItem: React.FC<MenuItemProps> = ({ onComplete }) => {
    const { openDialog } = useFileSystemDialog();

    return (
        <ContextMenuItem onClick={() => {
            openDialog('move');
            onComplete();
        }}>
            <Move className="mr-2 h-4 w-4"/>
            Move to...
        </ContextMenuItem>
    );
};

const RenameMenuItem: React.FC<MenuItemProps> = ({ onComplete }) => {
    const { openDialog } = useFileSystemDialog();

    return (
        <ContextMenuItem onClick={() => {
            openDialog('rename');
            onComplete();
        }}>
            <Edit className="mr-2 h-4 w-4"/>
            Rename
        </ContextMenuItem>
    );
};

const DeleteMenuItem: React.FC<MenuItemProps> = ({ onComplete }) => {
    const { openDialog } = useFileSystemDialog();

    return (
        <ContextMenuItem
            onClick={() => {
                openDialog('delete');
                onComplete();
            }}
            className="text-red-600"
        >
            <Trash className="mr-2 h-4 w-4"/>
            Delete
        </ContextMenuItem>
    );
};

export const FileContextMenu: React.FC<{ menuData: MenuData; onClose: () => void }> = ({
    onClose
}) => {
    return (
        <>
            <DownloadMenuItem onComplete={onClose} />
            <OpenInNewTabMenuItem onComplete={onClose} />
            <ContextMenuSeparator/>
            <CopyMenuItem onComplete={onClose} />
            <MoveMenuItem onComplete={onClose} />
            <RenameMenuItem onComplete={onClose} />
            <ContextMenuSeparator/>
            <DeleteMenuItem onComplete={onClose} />
        </>
    );
};