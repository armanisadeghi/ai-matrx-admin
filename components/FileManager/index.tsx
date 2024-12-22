// FileManager/index.tsx
import React from 'react';
import {FileManagerHeader} from './FileManagerHeader';
import {FileManagerSidebar} from './FileManagerSidebar';
import {FileManagerContent} from './FileManagerContent';
import {DialogProvider} from './DialogManager';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {FileManagerProps} from './types';
import {useRegisterContextMenu} from "@/providers/ContextMenuProvider";
import {FileContextMenu} from "@/components/GlobalContextMenu/version-one/menus/FileContextMenu";
import {FolderContextMenu} from "@/components/FileManager/ContextMenus/FolderContextMenu";
import DebuggerConsole from "@/utils/file-operations/DebuggerConsole";

export const FileManager: React.FC<FileManagerProps> = (
    {
        defaultBucket,
        showDebugger = true,
        allowedFileTypes,
        maxFileSize
    }) => {
    const {isLoading, setCurrentBucket} = useFileSystem();
    useRegisterContextMenu('file', FileContextMenu);
    useRegisterContextMenu('folder', FolderContextMenu);

    React.useEffect(() => {
        if (defaultBucket) {
            setCurrentBucket(defaultBucket);
        }
    }, [defaultBucket]);


    return (
        <DialogProvider>
            <div className="h-screen flex flex-col">
                <FileManagerHeader/>
                <div className="flex-1 flex overflow-hidden">
                    <FileManagerSidebar/>
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <FileManagerContent
                            allowedFileTypes={allowedFileTypes}
                            maxFileSize={maxFileSize}
                        />
                        {showDebugger && <DebuggerConsole/>}
                    </div>
                </div>
            </div>
        </DialogProvider>
    );
};