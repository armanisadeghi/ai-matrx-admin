// Dialogs/DeleteDialog.tsx
import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFileSystem } from '@/providers/FileSystemProvider';

interface DeleteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => Promise<void>;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({ isOpen, onClose, onSubmit }) => {
    const { currentPath } = useFileSystem();
    const fileName = currentPath[currentPath.length - 1] || '';

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete "{fileName}"
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onSubmit}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
