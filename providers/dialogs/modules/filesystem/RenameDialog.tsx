// RenameDialog.tsx
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createStandardDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { BaseDialogProps } from "../../types";

export const RenameDialog = () => {
 const DialogComponent = ({ onClose }: Pick<BaseDialogProps, 'onClose'>) => {
   const dispatch = useAppDispatch();
   const { activeBucket } = useFileSystem();
   const slice = createFileSystemSlice(activeBucket);
   const selectors = createFileSystemSelectors(activeBucket);
   const activeNode = useAppSelector(selectors.selectActiveNode);
   const [newName, setNewName] = useState(activeNode?.name || "");

   const handleRename = useCallback(
     async () => {
       if (!activeNode) return;

       try {
         await dispatch(
           slice.actions.renameActiveNode({
             newName: newName.trim()
           })
         ).unwrap();
         onClose();
       } catch (error) {
         console.error("Failed to rename:", error);
       }
     },
     [dispatch, slice.actions, newName, activeNode, onClose]
   );

   return createStandardDialog({
     id: "filesystem.rename",
     title: "Rename Item",
     description: `Enter a new name for "${activeNode?.name}"`,
     content: (
       <div className="space-y-4">
         <Input
           value={newName}
           onChange={(e) => setNewName(e.target.value)}
           placeholder="New name"
           autoFocus
         />
         <div className="flex justify-end space-x-2">
           <Button variant="outline" onClick={onClose}>
             Cancel
           </Button>
           <Button
             onClick={handleRename}
             disabled={!newName.trim() || newName.trim() === activeNode?.name}
           >
             Rename
           </Button>
         </div>
       </div>
     ),
   });
 };

 return DialogComponent;
};