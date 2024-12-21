// components/FileManager/DialogManager.tsx
import React from 'react';
import { RenameDialog } from './Dialogs/RenameDialog';
import { CreateFolderDialog } from './Dialogs/CreateFolderDialog';
import { MoveDialog } from './Dialogs/MoveDialog';

interface DialogState {
    type: 'rename' | 'createFolder' | 'move' | null;
    props: any;
}

export const DialogContext = React.createContext<{
    openDialog: (type: DialogState['type'], props?: any) => void;
    closeDialog: () => void;
}>({
    openDialog: () => {},
    closeDialog: () => {},
});

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dialog, setDialog] = React.useState<DialogState>({ type: null, props: {} });

    const openDialog = (type: DialogState['type'], props = {}) => {
        setDialog({ type, props });
    };

    const closeDialog = () => {
        setDialog({ type: null, props: {} });
    };

    return (
        <DialogContext.Provider value={{ openDialog, closeDialog }}>
            {children}
            <RenameDialog
                isOpen={dialog.type === 'rename'}
                onClose={closeDialog}
                {...dialog.props}
            />
            <CreateFolderDialog
                isOpen={dialog.type === 'createFolder'}
                onClose={closeDialog}
                {...dialog.props}
            />
            <MoveDialog
                isOpen={dialog.type === 'move'}
                onClose={closeDialog}
                {...dialog.props}
            />
        </DialogContext.Provider>
    );
};

export const useDialog = () => React.useContext(DialogContext);