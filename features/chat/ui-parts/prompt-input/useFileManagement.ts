import { useState, useCallback, useEffect } from "react";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";

interface FileManagementProps {
    onFilesUpdate?: (files: { url: string; type: string; details?: any }[]) => void;
}

export function useFileManagement({ onFilesUpdate }: FileManagementProps = {}) {
    const [files, setFiles] = useState<{ url: string; type: string; details?: EnhancedFileDetails }[]>([]);
    const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Toggle upload component visibility
    const toggleFileUpload = useCallback(() => {
        setShowFileUpload((prev) => {
            return !prev;
        });
    }, [showFileUpload]);

    // Method for FileUploadWithStorage to notify when it's uploading
    const handleUploadStatusChange = useCallback((uploading: boolean) => {
        setIsUploading(uploading);
    }, []);

    // Add files to the manager and notify the handler
    const addFiles = useCallback(
        async (newFiles: { url: string; type: string; details?: EnhancedFileDetails }[]) => {
            try {
                setIsUploading(true);
                const allFiles = [...files, ...newFiles];
                setFiles(allFiles);

                // Sanitize files for storage (remove icon which can't be serialized)
                const sanitizedFiles = allFiles.map((file) => {
                    if (file.details) {
                        const { icon, ...serializableDetails } = file.details;
                        return {
                            ...file,
                            details: serializableDetails,
                        };
                    }
                    return file;
                });

                // Call the update handler if it exists
                if (onFilesUpdate) {
                    onFilesUpdate(sanitizedFiles);
                } else {
                    console.warn("⚠️ onFilesUpdate is not defined!");
                }

                setShowFileUpload(false);
            } catch (error) {
                console.error("Error adding files:", error);
            } finally {
                setIsUploading(false);
            }
        },
        [files, onFilesUpdate]
    );

    // Remove a file at a specific index
    const removeFile = useCallback(
        (index: number) => {
            setFiles((currentFiles) => {
                const newFiles = [...currentFiles];
                newFiles.splice(index, 1);

                // Sanitize files for storage
                const sanitizedFiles = newFiles.map((file) => {
                    if (file.details) {
                        const { icon, ...serializableDetails } = file.details;
                        return {
                            ...file,
                            details: serializableDetails,
                        };
                    }
                    return file;
                });

                // Call the update handler if it exists
                if (onFilesUpdate) {
                    onFilesUpdate(sanitizedFiles);
                } else {
                    console.warn("⚠️ onFilesUpdate is not defined in removeFile!");
                }

                return newFiles;
            });
        },
        [onFilesUpdate]
    );

    // Clear all files
    const clearFiles = useCallback(() => {
        setFiles([]);

        // Call the update handler if it exists
        if (onFilesUpdate) {
            onFilesUpdate([]);
        } else {
            console.warn("⚠️ onFilesUpdate is not defined in clearFiles!");
        }
    }, [onFilesUpdate]);

    const result = {
        // File state
        files,

        // UI state
        showFileUpload,
        toggleFileUpload,

        // Upload status
        isUploading,
        handleUploadStatusChange,

        // Processing status
        isProcessing,
        setIsProcessing,

        // File operations
        addFiles,
        removeFile,
        clearFiles,
    };

    return result;
}
