// components/FileManager/FileManagerContent/utils.ts

import {BucketStructure} from "@/utils/file-operations";

export const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDate = (date: string | number | Date): string => {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
        return 'Invalid date';
    }

    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

interface FileFilterConfig {
    hiddenFiles: Set<string>;
    hiddenFolders: Set<string>;
}

class FileFilterManager {
    private static instance: FileFilterManager;
    private config: FileFilterConfig = {
        hiddenFiles: new Set(['.emptyFolderPlaceholder', '.folder']),
        hiddenFolders: new Set([])
    };

    private constructor() {}

    static getInstance(): FileFilterManager {
        if (!FileFilterManager.instance) {
            FileFilterManager.instance = new FileFilterManager();
        }
        return FileFilterManager.instance;
    }

    addHiddenFile(filename: string): void {
        this.config.hiddenFiles.add(filename);
    }

    addHiddenFolder(foldername: string): void {
        this.config.hiddenFolders.add(foldername);
    }

    removeHiddenFile(filename: string): void {
        this.config.hiddenFiles.delete(filename);
    }

    removeHiddenFolder(foldername: string): void {
        this.config.hiddenFolders.delete(foldername);
    }

    isHidden(path: string, type: string): boolean {
        const name = path.split('/').pop() || '';
        return type === 'FILE'
            ? this.config.hiddenFiles.has(name)
            : this.config.hiddenFolders.has(name);
    }
}

export const fileFilter = FileFilterManager.getInstance();

// Helper function to use in components
export const shouldShowItem = (item: BucketStructure): boolean => {
    return !fileFilter.isHidden(item.path, item.type);
};
