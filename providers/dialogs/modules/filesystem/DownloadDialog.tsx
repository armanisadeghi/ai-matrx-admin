// DownloadDialog.tsx
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createStandardDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { FileMetadataCard } from "@/components/FileManager/SmartComponents/FileMetadataCard";
import { BaseDialogProps } from "../../types";

export const DownloadDialog = () => {
 const DialogComponent = ({ onClose }: Pick<BaseDialogProps, 'onClose'>) => {
   const dispatch = useAppDispatch();
   const { activeBucket } = useFileSystem();
   const slice = createFileSystemSlice(activeBucket);
   const selectors = createFileSystemSelectors(activeBucket);
   const activeNode = useAppSelector(selectors.selectActiveNode);

   const handleDownload = useCallback(
     async () => {
       if (!activeNode) return;
       try {
         const result = await dispatch(
           slice.actions.downloadFile({})
         ).unwrap();
         
         // Create download link
         const url = URL.createObjectURL(result.blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = activeNode.name;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
         
         onClose();
       } catch (error) {
         console.error("Failed to download:", error);
       }
     },
     [dispatch, slice.actions, activeNode, onClose]
   );

   return createStandardDialog({
     id: "filesystem.download",
     title: "Download File",
     description: "Download this file to your computer",
     content: (
       <div className="space-y-4">
         <FileMetadataCard />
         <div className="flex justify-end">
           <Button onClick={handleDownload}>
             Download
           </Button>
         </div>
       </div>
     ),
   });
 };

 return DialogComponent;
};