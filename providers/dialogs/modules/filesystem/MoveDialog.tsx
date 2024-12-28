import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createStandardDialog } from "../../factory/usCreateDialog";
import { useFileSystem } from "@/providers/FileSystemProvider";

export const MoveDialog = () => {
  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  const slice = createFileSystemSlice(activeBucket);
  const selectors = createFileSystemSelectors(activeBucket);
  const activeNode = useAppSelector(selectors.selectActiveNode);
  const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  const handleMove = useCallback(
    async (close: () => void) => {
      if (!targetFolderId) return;

      try {
        await dispatch(
          slice.actions.moveSelections({
            newPath: targetFolderId,
          })
        ).unwrap();
        close();
      } catch (error) {
        console.error("Failed to move items:", error);
      }
    },
    [dispatch, slice.actions, targetFolderId]
  );

  if (!activeNode) return null;

  const itemCount = selectedNodes.length || 1;
  const itemText = itemCount === 1 ? activeNode.name : `${itemCount} items`;

  return createStandardDialog({
    id: "filesystem.move",
    title: "Move Items",
    description: `Select a destination folder for ${itemText}`,
    content: (close) => (
      <div className="space-y-4">
        <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
          <FolderTree
            onSelect={setTargetFolderId}
            selectedId={targetFolderId}
            excludeIds={selectedNodes.map((node) => node.itemId)}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => handleMove(close)} disabled={!targetFolderId}>
            Move
          </Button>
        </div>
      </div>
    ),
  });
};
