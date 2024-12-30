// DeleteDialog.tsx
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createAlertDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { BaseDialogProps } from "../../types";

export const DeleteDialog = () => {
 const DialogComponent = ({ onClose }: Pick<BaseDialogProps, 'onClose'>) => {
   const dispatch = useAppDispatch();
   const { activeBucket } = useFileSystem();
   const slice = createFileSystemSlice(activeBucket);
   const selectors = createFileSystemSelectors(activeBucket);
   const activeNode = useAppSelector(selectors.selectActiveNode);
   const isFolder = activeNode?.contentType === "FOLDER";
   const childNodes = isFolder
     ? useAppSelector(selectors.selectNodeChildren(activeNode.itemId))
     : [];

   const handleDelete = useCallback(async () => {
     if (!activeNode) return;
     try {
       await dispatch(slice.actions.deleteActiveNode()).unwrap();
       onClose();
     } catch (error) {
       console.error("Failed to delete:", error);
     }
   }, [dispatch, slice.actions, activeNode, onClose]);

   if (!activeNode) return null;

   const description = isFolder && childNodes.length > 0 ? (
     <>
       <p>Are you sure you want to delete the folder "{activeNode.name}"?</p>
       <p className="mt-2">This folder contains {childNodes.length} item(s):</p>
       <ul className="mt-1 ml-4 list-disc">
         {childNodes.slice(0, 5).map((child) => (
           <li key={child.itemId}>{child.name}</li>
         ))}
         {childNodes.length > 5 && (
           <li>And {childNodes.length - 5} more items...</li>
         )}
       </ul>
     </>
   ) : (
     `Are you sure you want to delete "${activeNode.name}"?`
   );

   return createAlertDialog({
     id: "filesystem.delete",
     title: `Delete ${isFolder ? 'Folder' : 'File'}`,
     description,
     confirmLabel: "Delete",
     cancelLabel: "Cancel",
     confirmVariant: "destructive",
     onConfirm: handleDelete
   });
 };

 return DialogComponent;
};