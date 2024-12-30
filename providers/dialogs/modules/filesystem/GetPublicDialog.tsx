// GetPublicDialog.tsx
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createStandardDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { FileMetadataCard } from "@/components/FileManager/SmartComponents/FileMetadataCard";
import { Check, Copy } from "lucide-react";
import { BaseDialogProps } from "../../types";

export const GetPublicDialog = () => {
 const DialogComponent = ({ onClose }: Pick<BaseDialogProps, 'onClose'>) => {
   const dispatch = useAppDispatch();
   const { activeBucket } = useFileSystem();
   const slice = createFileSystemSlice(activeBucket);
   const selectors = createFileSystemSelectors(activeBucket);
   const activeNode = useAppSelector(selectors.selectActiveNode);
   const [copied, setCopied] = useState(false);

   const handleGetUrl = useCallback(
     async () => {
       if (!activeNode) return;
       try {
         await dispatch(
           slice.actions.getPublicFile({
             nodeId: activeNode.itemId
           })
         ).unwrap();
       } catch (error) {
         console.error("Failed to get public URL:", error);
       }
     },
     [dispatch, slice.actions, activeNode]
   );

   const handleCopy = useCallback(() => {
     if (!activeNode?.publicUrl) return;
     navigator.clipboard.writeText(activeNode.publicUrl);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
   }, [activeNode?.publicUrl]);

   return createStandardDialog({
     id: "filesystem.getPublicFile",
     title: "Share File",
     description: "Get a public URL for this file",
     content: (
       <div className="space-y-4">
         <FileMetadataCard />
         {activeNode?.publicUrl ? (
           <div className="flex space-x-2">
             <Input 
               value={activeNode.publicUrl} 
               readOnly 
               onClick={(e) => e.currentTarget.select()}
             />
             <Button
               variant="outline"
               size="icon"
               onClick={handleCopy}
             >
               {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
             </Button>
           </div>
         ) : (
           <Button onClick={handleGetUrl} className="w-full">
             Generate Public URL
           </Button>
         )}
       </div>
     ),
   });
 };

 return DialogComponent;
};