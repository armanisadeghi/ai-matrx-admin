// SyncDialog.tsx
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createStandardDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { FileMetadataCard } from "@/components/FileManager/SmartComponents/FileMetadataCard";
import { BaseDialogProps } from "../../types";

export const SyncDialog = () => {
 const DialogComponent = ({ onClose }: Pick<BaseDialogProps, 'onClose'>) => {
   const dispatch = useAppDispatch();
   const { activeBucket } = useFileSystem();
   const slice = createFileSystemSlice(activeBucket);
   const selectors = createFileSystemSelectors(activeBucket);
   const activeNode = useAppSelector(selectors.selectActiveNode);

   const handleSync = useCallback(
     async () => {
       if (!activeNode) return;
       try {
         await dispatch(
           slice.actions.syncNode({
             nodeId: activeNode.itemId
           })
         ).unwrap();
         onClose();
       } catch (error) {
         console.error("Failed to sync:", error);
       }
     },
     [dispatch, slice.actions, activeNode, onClose]
   );

   return createStandardDialog({
     id: "filesystem.sync",
     title: "Sync File",
     description: "Refresh file metadata and content from storage",
     content: (
       <div className="space-y-4">
         <FileMetadataCard />
         <div className="flex justify-end">
           <Button onClick={handleSync}>
             Sync Now
           </Button>
         </div>
       </div>
     ),
   });
 };

 return DialogComponent;
};

