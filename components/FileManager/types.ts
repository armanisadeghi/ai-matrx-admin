// FileManager/types.ts
export interface FileManagerProps {
    defaultBucket?: string;
    showDebugger?: boolean;
    allowedFileTypes?: string[];
    maxFileSize?: number;
    // Add any other configuration options
}

export interface FileOperationResult {
    success: boolean;
    message?: string;
    error?: any;
}

// Add any other shared types