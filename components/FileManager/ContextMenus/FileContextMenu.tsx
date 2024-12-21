// components/FileManager/ContextMenus/FileContextMenu.tsx
import React from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {useDialog} from '../DialogManager';
import {useContextMenu} from '../ContextMenuProvider';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {Copy, Download, Edit, ExternalLink, Move, Trash} from 'lucide-react';
import {FileContextMenuProps} from './types';

export const FileContextMenu: React.FC<FileContextMenuProps> = (
    {
        children,
        path,
        bucketName,
    }) => {
    const {openMenu, closeMenu, menuState} = useContextMenu();
    const {downloadFile, deleteFile, getPublicUrl} = useFileSystem();
    const {openDialog} = useDialog();
    const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        openMenu(e, 'file', {path, bucketName});
    };

    const handleDownload = async () => {
        const blob = await downloadFile(bucketName, path);
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = path.split('/').pop() || 'download';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };

    const handleDelete = async () => {
        setShowDeleteAlert(true);
    };

    const confirmDelete = async () => {
        await deleteFile(bucketName, path);
        setShowDeleteAlert(false);
    };

    const handleCopy = () => {
        openDialog('move', {
            sourcePath: path,
            type: 'file',
            mode: 'copy',
            bucketName
        });
    };

    const handleMove = () => {
        openDialog('move', {
            sourcePath: path,
            type: 'file',
            mode: 'move',
            bucketName
        });
    };

    const handleRename = () => {
        openDialog('rename', {
            path,
            type: 'file',
            bucketName
        });
    };

    return (
        <>
            <div onContextMenu={handleContextMenu}>
                {children}
            </div>

            {menuState.isOpen && menuState.type === 'file' && menuState.data.path === path && (
                <ContextMenuContent
                    className="w-64"
                    style={{
                        position: 'fixed',
                        top: menuState.y,
                        left: menuState.x,
                    }}
                >
                    <ContextMenuItem onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4"/>
                        Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => window.open(getPublicUrl(bucketName, path))}>
                        <ExternalLink className="mr-2 h-4 w-4"/>
                        Open in new tab
                    </ContextMenuItem>
                    <ContextMenuSeparator/>
                    <ContextMenuItem onClick={handleCopy}>
                        <Copy className="mr-2 h-4 w-4"/>
                        Copy to...
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleMove}>
                        <Move className="mr-2 h-4 w-4"/>
                        Move to...
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleRename}>
                        <Edit className="mr-2 h-4 w-4"/>
                        Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator/>
                    <ContextMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash className="mr-2 h-4 w-4"/>
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            )}

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{path.split('/').pop()}"
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};