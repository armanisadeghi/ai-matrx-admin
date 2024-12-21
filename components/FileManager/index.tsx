// FileManager/index.tsx
import React from 'react';
import {FileManagerHeader} from './FileManagerHeader';
import {FileManagerSidebar} from './FileManagerSidebar';
import {FileManagerContent} from './FileManagerContent';
import {FileManagerDebugger} from './FileManagerDebugger';
import {DialogProvider} from './DialogManager';
import {ContextMenuProvider} from './ContextMenuProvider';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {FileManagerProps} from './types';

export const FileManager: React.FC<FileManagerProps> = (
    {
        defaultBucket,
        showDebugger = true,
        allowedFileTypes,
        maxFileSize
    }) => {
    const {isLoading, setCurrentBucket} = useFileSystem();

    React.useEffect(() => {
        if (defaultBucket) {
            setCurrentBucket(defaultBucket);
        }
    }, [defaultBucket]);

    return (
        <ContextMenuProvider>
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
                            {showDebugger && <FileManagerDebugger/>}
                        </div>
                    </div>
                </div>
            </DialogProvider>
        </ContextMenuProvider>
    );
};