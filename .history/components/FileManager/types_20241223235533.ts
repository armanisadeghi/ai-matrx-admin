// FileManager/types.ts
export interface FileManagerProps {
    defaultBucket?: string;
}

export interface FileOperationResult {
    success: boolean;
    message?: string;
    error?: any;
}

// Add any other shared types