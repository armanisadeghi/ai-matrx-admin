// CreateFileDialog.tsx
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createStandardDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Folder, Database, AlertCircle } from "lucide-react";
import { BaseDialogProps } from "../../types";

export const CreateFileDialog = () => {
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
           slice.actions.createFile({
             name: name.trim(),
             content: new Blob([''], { type: 'text/plain' }),
             parentId: activeNode?.itemId || null
           })
         ).unwrap();
         onClose();
       } catch (error) {
         console.error("Failed to create file:", error);
       }
     },
     [dispatch, slice.actions, name, activeNode, onClose]
   );

   const LocationDisplay = () => {
     if (!activeBucket) {
       return (
         <Alert variant="destructive" className="mb-4">
           <AlertCircle className="h-4 w-4" />
           <AlertDescription>No bucket selected</AlertDescription>
         </Alert>
       );
     }

     return (
       <div className="mb-6 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
         <div className="flex items-center space-x-2 mb-2">
           <Database className="h-4 w-4 text-muted-foreground" />
           <span className="font-medium">Bucket:</span>
           <span className="text-muted-foreground">{activeBucket}</span>
         </div>
         <div className="flex items-center space-x-2">
           <Folder className="h-4 w-4 text-muted-foreground" />
           <span className="font-medium">Folder:</span>
           <span className="text-muted-foreground">
             {activeNode?.name || 'Root'}
           </span>
         </div>
       </div>
     );
   };

   return createStandardDialog({
     id: "filesystem.createFile",
     title: "Create New File",
     description: "Enter a name for the new file",
     content: (
       <div className="space-y-4">
         <LocationDisplay />
         <Input
           value={name}
           onChange={(e) => setName(e.target.value)}
           placeholder="File name"
           autoFocus
           className="w-full"
         />
         <div className="flex justify-end space-x-2">
           <Button variant="outline" onClick={onClose}>
             Cancel
           </Button>
           <Button
             onClick={handleCreate}
             disabled={!name.trim() || !activeBucket}
           >
             Create
           </Button>
         </div>
       </div>
     ),
   });
 };

 return DialogComponent;
};

export default CreateFileDialog;