import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createAlertDialog, createStandardDialog } from "../../factory/usCreateDialog";
import { useFileSystem } from "@/providers/FileSystemProvider";

export const DeleteDialog = () => {
    const dispatch = useAppDispatch();
    const { activeBucket } = useFileSystem();
    const slice = createFileSystemSlice(activeBucket);
    const selectors = createFileSystemSelectors(activeBucket);
    const activeNode = useAppSelector(selectors.selectActiveNode);
    const isFolder = activeNode.contentType === "FOLDER";

    const childNodes = isFolder 
        ? useAppSelector(selectors.selectNodeChildren(activeNode.itemId))
        : [];

    const handleDelete = useCallback(async () => {
        if (!activeNode) return;
        
        try {
            await dispatch(
                slice.actions.deleteActiveNode()
            ).unwrap();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    }, [dispatch, slice.actions, activeNode]);

    if (!activeNode) return null;

    const getDescription = () => {
        if (isFolder && childNodes.length > 0) {
            return (
                <>
                    <p>Are you sure you want to delete the folder "{activeNode.name}"?</p>
                    <p className="mt-2">This folder contains {childNodes.length} item(s):</p>
                    <ul className="mt-1 ml-4 list-disc">
                        {childNodes.slice(0, 5).map(child => (
                            <li key={child.itemId}>{child.name}</li>
                        ))}
                        {childNodes.length > 5 && (
                            <li>And {childNodes.length - 5} more items...</li>
                        )}
                    </ul>
                </>
            );
        }
        return `Are you sure you want to delete "${activeNode.name}"?`;
    };

    return createAlertDialog({
        id: 'filesystem.delete',
        title: `Delete ${isFolder ? 'Folder' : 'File'}`,
        description: getDescription(),
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        confirmVariant: 'destructive',
        onConfirm: handleDelete,
    });
};

