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



export { formatFileSize as formatBytes };
