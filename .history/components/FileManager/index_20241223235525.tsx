// components/FileManager/index.tsx
import React from "react";
import { FileManagerHeader } from "./FileManagerHeader";
import { useFileSystem } from "@/providers/FileSystemProvider";
import { FileManagerProps } from "./types";
import { useRegisterContextMenu } from "@/providers/ContextMenuProvider";
import { FileContextMenu } from "@/components/GlobalContextMenu/version-one/menus/FileContextMenu";
import { FolderContextMenu } from "@/components/FileManager/ContextMenus/FolderContextMenu";
import DebuggerConsole from "@/utils/file-operations/DebuggerConsole";
import PageSkeleton from "../layout/page-skeleton";
import { FilePreview } from "./FilePreview";

export const FileManager: React.FC<FileManagerProps> = ({
    defaultBucket,
}) => {
    const { isInitialized, isLoading, setCurrentBucket, refreshBucketStructure } =
        useFileSystem();

    useRegisterContextMenu("file", FileContextMenu);
    useRegisterContextMenu("folder", FolderContextMenu);

    React.useEffect(() => {
        if (defaultBucket) {
            setCurrentBucket(defaultBucket);
            refreshBucketStructure(defaultBucket);
        }
    }, [defaultBucket]);

    if (!isInitialized || isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <PageSkeleton />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            <FileManagerHeader />
            <div className="flex-1 overflow-hidden">
                <FilePreview />
            </div>
        </div>
    );
};
