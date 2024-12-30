import { Button } from "@/components/ui/button";

import { useFileSystem } from "@/providers/FileSystemProvider";
import { createAlertDialog } from "../../../factory/CreateDialog";

export const DeleteFileDialog = () => {
    const { currentPath, deleteFile } = useFileSystem();
    const fileName = currentPath[currentPath.length - 1] || '';

    const dialogConfig = createAlertDialog({
        id: 'filesystem.delete',
        title: 'Delete File',
        description: `Are you sure you want to delete "${fileName}"?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        confirmVariant: 'destructive',
        onConfirm: deleteFile,
        trigger: (open) => (
            <Button variant="destructive" onClick={open}>
                Delete File
            </Button>
        ),
    });

    return dialogConfig;
};
