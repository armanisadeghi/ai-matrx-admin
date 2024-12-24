'use client';

import React from 'react';
import { RenameDialog } from './RenameDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { MoveDialog } from './MoveDialog';
import { DeleteDialog } from './DeleteDialog';
import { useFileSystem } from '@/providers/FileSystemProvider';
import {BucketPropertiesDialog, BucketSettingsDialog } from './BucketDialogs';

type DialogOperation = 'rename' | 'createFolder' | 'move' | 'copy' | 'delete' | 'settings' | 'properties' | null;

interface DialogContextValue {
    openDialog: (operation: DialogOperation) => void;
    closeDialog: () => void;
}

export const FileSystemDialogContext = React.createContext<DialogContextValue>({
    openDialog: () => {},
    closeDialog: () => {},
});

export const FileSystemDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [operation, setOperation] = React.useState<DialogOperation>(null);
    const {
        moveFileToPath,
        copyFileToPath,
        createFolderInCurrentPath,
        deleteFile,
        renameCurrentItem
    } = useFileSystem();

    const closeDialog = () => setOperation(null);

    const handleOperation = async (action: () => Promise<boolean>) => {
        const success = await action();
        if (success) closeDialog();
    };

    return (
        <FileSystemDialogContext.Provider value={{ openDialog: setOperation, closeDialog }}>
            {children}
            <RenameDialog
                isOpen={operation === 'rename'}
                onClose={closeDialog}
                onSubmit={value => handleOperation(() => renameCurrentItem(value))}
            />
            <CreateFolderDialog
                isOpen={operation === 'createFolder'}
                onClose={closeDialog}
                onSubmit={value => handleOperation(() => createFolderInCurrentPath(value))}
            />
            <MoveDialog
                isOpen={operation === 'move'}
                onClose={closeDialog}
                mode="move"
                onSubmit={path => handleOperation(() => moveFileToPath(path))}
            />
            <MoveDialog
                isOpen={operation === 'copy'}
                onClose={closeDialog}
                mode="copy"
                onSubmit={path => handleOperation(() => copyFileToPath(path))}
            />
            <DeleteDialog
                isOpen={operation === 'delete'}
                onClose={closeDialog}
                onSubmit={() => handleOperation(deleteFile)}
            />
            <BucketSettingsDialog
                isOpen={operation === 'settings'}
                onClose={closeDialog}
            />
            <BucketPropertiesDialog
                isOpen={operation === 'properties'}
                onClose={closeDialog}
            />

        </FileSystemDialogContext.Provider>
    );
};

export const useFileSystemDialog = () => React.useContext(FileSystemDialogContext);