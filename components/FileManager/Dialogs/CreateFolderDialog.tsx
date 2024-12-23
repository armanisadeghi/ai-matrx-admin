// components/FileManager/Dialogs/CreateFolderDialog.tsx
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {EnterInput} from "@/components/ui/input";
import {useFileSystem} from '@/providers/FileSystemProvider';

interface CreateFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentPath: string;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = (
    {
        isOpen,
        onClose,
        currentPath
    }) => {
    const {currentBucket, createFolder} = useFileSystem();
    const [folderName, setFolderName] = React.useState('');

    const handleCreate = async () => {
        if (!folderName.trim()) return;

        const newPath = currentPath
            ? `${currentPath}/${folderName}`
            : folderName;

        await createFolder(currentBucket!, newPath);
        setFolderName('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create new folder</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <EnterInput
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onEnter={handleCreate}
                        placeholder="Enter folder name"
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};