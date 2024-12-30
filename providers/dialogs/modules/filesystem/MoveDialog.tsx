// MoveDialog.tsx
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createStandardDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import BasicFolderTree from "@/components/file-system/tree/BasicFolderTree";
import { FileSystemNode, NodeItemId } from "@/lib/redux/fileSystem/types";
import { BaseDialogProps } from "../../types";

export const MoveDialog = () => {
 const DialogComponent = ({ onClose }: Pick<BaseDialogProps, 'onClose'>) => {
   const dispatch = useAppDispatch();
   const { activeBucket } = useFileSystem();
   const slice = createFileSystemSlice(activeBucket);
   const selectors = createFileSystemSelectors(activeBucket);
   const activeNode = useAppSelector(selectors.selectActiveNode);
   const selectedNodes = useAppSelector(selectors.selectSelectedNodes);

   const [originalSelection, setOriginalSelection] = useState<{
     selectedNodes: NodeItemId[];
     activeNode: NodeItemId | null;
   } | null>(null);
   const [targetFolderId, setTargetFolderId] = useState<NodeItemId | null>(null);

   useEffect(() => {
     if (!originalSelection && activeNode) {
       setOriginalSelection({
         selectedNodes: selectedNodes.map((node) => node.itemId),
         activeNode: activeNode.itemId,
       });
     }
   }, [activeNode, originalSelection, selectedNodes]);

   const handleFolderSelect = useCallback((node: FileSystemNode) => {
     setTargetFolderId(node.itemId);
   }, []);

   const handleMove = useCallback(async () => {
     if (!targetFolderId || !originalSelection) return;

     try {
       // Restore original selection state
       originalSelection.selectedNodes.forEach((nodeId) => {
         dispatch(
           slice.actions.selectNode({
             nodeId,
             isMultiSelect: true,
             isRangeSelect: false,
           })
         );
       });

       if (originalSelection.activeNode) {
         dispatch(
           slice.actions.selectNode({
             nodeId: originalSelection.activeNode,
             isMultiSelect: false,
             isRangeSelect: false,
           })
         );
       }

       await dispatch(
         slice.actions.moveSelections({
           newPath: targetFolderId,
         })
       ).unwrap();
       onClose();
     } catch (error) {
       console.error("Failed to move items:", error);
     }
   }, [dispatch, slice.actions, targetFolderId, originalSelection, onClose]);

   if (!activeNode) return null;

   const itemCount = selectedNodes.length || 1;
   const itemText = itemCount === 1 ? activeNode.name : `${itemCount} items`;

   return createStandardDialog({
     id: "filesystem.move",
     title: "Move Items",
     description: `Select a destination folder for ${itemText}`,
     content: (
       <div className="space-y-4">
         <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
           <BasicFolderTree onFolderSelect={handleFolderSelect} />
         </div>
         <div className="flex justify-end space-x-2">
           <Button variant="outline" onClick={onClose}>
             Cancel
           </Button>
           <Button onClick={handleMove} disabled={!targetFolderId}>
             Move
           </Button>
         </div>
       </div>
     ),
   });
 };

 return DialogComponent;
};