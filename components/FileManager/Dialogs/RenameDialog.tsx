// components/FileManager/Dialogs/RenameDialog.tsx
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useFileSystem} from '@/providers/FileSystemProvider';

interface RenameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    path: string;
    type: 'file' | 'folder';
}

export const RenameDialog: React.FC<RenameDialogProps> = (
    {
        isOpen,
        onClose,
        path = '', // Provide default empty string
        type
    }) => {
    const {currentBucket, renameFile, renameFolder} = useFileSystem();
    const [newName, setNewName] = React.useState('');
    const currentName = path.split('/').pop() || '';

    React.useEffect(() => {
        setNewName(currentName);
    }, [currentName]);

    const handleRename = async () => {
        if (!newName.trim()) return;

        const parentPath = path.split('/').slice(0, -1).join('/');
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;

        if (type === 'file') {
            await renameFile(currentBucket!, path, newPath);
        } else {
            await renameFolder(currentBucket!, path, newPath);
        }

        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename {type}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={`Enter new ${type} name`}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleRename}>
                        Rename
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};