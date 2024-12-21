// components/FileManager/ContextMenus/FolderContextMenu.tsx
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
import {Edit, FolderPlus, RefreshCw, Trash, Upload} from 'lucide-react';
import {FolderContextMenuProps} from './types';

export const FolderContextMenu: React.FC<FolderContextMenuProps> = (
    {
        children,
        path,
        bucketName,
    }) => {
    const {openMenu, closeMenu, menuState} = useContextMenu();

    const {
        deleteFile,
        refreshFolderContents,
        uploadFile,
    } = useFileSystem();
    const {openDialog} = useDialog();
    const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        openMenu(e, 'folder', {path, bucketName});
    };

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
            <div onContextMenu={handleContextMenu}>
                {children}
            </div>

            {menuState.isOpen && menuState.type === 'folder' && menuState.data.path === path && (
                <ContextMenuContent
                    className="w-64"
                    style={{
                        position: 'fixed',
                        top: menuState.y,
                        left: menuState.x,
                    }}
                >
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
                </ContextMenuContent>
            )}

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