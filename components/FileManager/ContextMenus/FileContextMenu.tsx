// components/FileManager/ContextMenus/FileContextMenu.tsx
import React from 'react';
import {ContextMenuItem, ContextMenuSeparator,} from "@/components/ui/context-menu"
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
import {useFileSystem} from '@/providers/FileSystemProvider';
import {Copy, Download, Edit, ExternalLink, Move, Trash, Upload} from 'lucide-react';
import {MenuData} from "@/providers/ContextMenuProvider";

interface FileMenuProps {
    menuData: MenuData;
    onClose: () => void;
}

export const FileContextMenu: React.FC<FileMenuProps> = ({menuData = {}, onClose}) => {
    const {downloadFile, deleteFile, getPublicUrl} = useFileSystem();
    const {path = '', bucketName = ''} = menuData as { path: string; bucketName: string };
    const {openDialog} = useDialog();
    const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

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
        onClose();
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