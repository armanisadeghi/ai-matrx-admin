import React from "react";
import { useDialogRegistry } from "../../useDialogRegistry";
import { DeleteDialog } from "./DeleteDialog";
import { RenameDialog } from "./RenameDialog";
import { CreateFileDialog } from "./CreateFileDialog";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { UploadDialog } from "./UploadDialog";
import { DownloadDialog } from "./DownloadDialog";
import { MoveDialog } from "./MoveDialog";
import { GetPublicDialog } from "./GetPublicDialog";
import { SyncDialog } from "./SyncDialog";
import { ListContentsDialog } from "./ListContentsDialog";
import { DialogConfig } from "@/providers/dialogs/types";

export const FileSystemDialogs: React.FC = () => {
  const dialogConfigs = React.useMemo(
    () => [
      {
        id: "filesystem.delete",
        component: DeleteDialog,
      },
      {
        id: "filesystem.rename",
        component: RenameDialog,
      },
      {
        id: "filesystem.createFile",
        component: CreateFileDialog,
      },
      {
        id: "filesystem.createFolder",
        component: CreateFolderDialog,
      },
      {
        id: "filesystem.upload",
        component: UploadDialog,
      },
      {
        id: "filesystem.download",
        component: DownloadDialog,
      },
      {
        id: "filesystem.move",
        component: MoveDialog,
      },
      {
        id: "filesystem.getPublicFile",
        component: GetPublicDialog,
      },
      {
        id: "filesystem.sync",
        component: SyncDialog,
      },
      {
        id: "filesystem.listContents",
        component: ListContentsDialog,
      },
    ] as DialogConfig[],
    []
  );

  useDialogRegistry(dialogConfigs);
  return null;
};