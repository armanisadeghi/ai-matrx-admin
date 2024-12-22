// components/FileManager/ContextMenus/FolderContextMenu.tsx
import React from 'react';
import {ContextMenuContent, ContextMenuItem, ContextMenuSeparator,} from "@/components/ui/context-menu"
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
import {Edit, FolderPlus, RefreshCw, Trash, Upload} from 'lucide-react';
import {MenuData} from '@/providers/ContextMenuProvider';

interface FolderMenuProps {
    menuData: MenuData;
    onClose: () => void;
}

export const FolderContextMenu: React.FC<FolderMenuProps> = ({menuData = {}, onClose}) => {
    const {uploadFile, deleteFile, refreshFolderContents} = useFileSystem();
    const {path = '', bucketName = ''} = menuData as { path: string; bucketName: string };
    const {openDialog} = useDialog();
    const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

    const handleUpload = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    await uploadFile(bucketName, `${path}/${file.name}`, file);
                }
                await refreshFolderContents(bucketName, path);
            }
        };
        input.click();
    };

    const handleCreateFolder = () => {
        openDialog('createFolder', {
            currentPath: path,
            bucketName
        });
    };

    const handleDelete = () => {
        setShowDeleteAlert(true);
    };

    const confirmDelete = async () => {
        await deleteFile(bucketName, path);
        setShowDeleteAlert(false);
    };

    const handleRename = () => {
        openDialog('rename', {
            path,
            type: 'folder',
            bucketName
        });
    };

    const handleRefresh = async () => {
        await refreshFolderContents(bucketName, path);
    };

    return (
        <>
            <ContextMenuItem onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4"/>
                Upload files
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateFolder}>
                <FolderPlus className="mr-2 h-4 w-4"/>
                New folder
            </ContextMenuItem>
            <ContextMenuSeparator/>
            <ContextMenuItem onClick={handleRename}>
                <Edit className="mr-2 h-4 w-4"/>
                Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4"/>
                Refresh
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
                            This will permanently delete the folder "{path.split('/').pop()}" and all its contents
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