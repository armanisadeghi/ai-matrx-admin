// ListContentsDialog.tsx
import { FileMetadataCard } from "@/components/FileManager/SmartComponents/FileMetadataCard";
import { createStandardDialog } from "../../factory/CreateDialog";
import { ActivePathTree } from "@/components/file-system/tree/ActivePathTree";
import { BaseDialogProps } from "../../types";

export const ListContentsDialog = () => {
 const DialogComponent = ({ onClose }: Pick<BaseDialogProps, 'onClose'>) => {
   return createStandardDialog({
     id: "filesystem.listContents",
     title: "Folder Contents",
     description: "View and manage folder contents",
     content: (
       <div className="space-y-4">
         <FileMetadataCard />
         <ActivePathTree />
       </div>
     ),
   });
 };

 return DialogComponent;
};