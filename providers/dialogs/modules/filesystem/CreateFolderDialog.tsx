// CreateFolderDialog.tsx
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createStandardDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { BaseDialogProps, DialogComponent } from "../../types";

// This function returns a DialogComponent
export const CreateFolderDialog = () => {
  // This is the actual DialogComponent that will be rendered
  const DialogComponent = ({ onClose }: Pick<BaseDialogProps, 'onClose'>) => {
    const dispatch = useAppDispatch();
    const { activeBucket } = useFileSystem();
    const slice = createFileSystemSlice(activeBucket);
    const selectors = createFileSystemSelectors(activeBucket);
    const activeNode = useAppSelector(selectors.selectActiveNode);
    const [name, setName] = useState("");

    const handleCreate = useCallback(
      async () => {
        try {
          await dispatch(
            slice.actions.createFolder({
              name: name.trim(),
              parentId: activeNode?.itemId || null
            })
          ).unwrap();
          onClose();
        } catch (error) {
          console.error("Failed to create folder:", error);
        }
      },
      [dispatch, slice.actions, name, activeNode, onClose]
    );

    return ( createStandardDialog({
      id: "filesystem.createFolder",
      title: "Create New Folder",
      description: "Enter a name for the new folder",
      content: (
        <div className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      ),
    }) );
  };

  return DialogComponent;
};