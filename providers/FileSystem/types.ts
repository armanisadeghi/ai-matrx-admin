// types/fileSystem.types.ts
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    BucketStructureWithNodes, NodeStructure,
} from '@/utils/file-operations';
import {FileSystemDialogProvider} from '@/components/FileManager/Dialogs/FileSystemDialogProvider';



export interface FileSystemState {
    isLoading: boolean;
    isInitialized: boolean;
    currentBucket: string | null;
    currentPath: string[];
    structures: Map<string, BucketStructureWithNodes>;
    activeNode: NodeStructure | null;
}

export interface SyncStatus {
    pendingUploads: number;
    modifiedFiles: number;
    conflicts: number;
}