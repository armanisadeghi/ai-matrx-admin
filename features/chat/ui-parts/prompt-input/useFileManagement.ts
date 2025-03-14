import { useState, useCallback } from "react";
import { ConversationWithRoutingResult } from "@/hooks/ai/chat/useConversationWithRouting";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";

interface FileManagementResult {
    files: { url: string; type: string; details?: EnhancedFileDetails }[];
    showFileUpload: boolean;
    isUploading: boolean;
    toggleFileUpload: () => void;
    addFiles: (newFiles: { url: string; type: string; details?: EnhancedFileDetails }[]) => Promise<void>;
    removeFile: (index: number) => void;
    clearFiles: () => void;
}

export function useFileManagement(chatHook: ConversationWithRoutingResult): FileManagementResult {
    const [files, setFiles] = useState<{ url: string; type: string; details?: EnhancedFileDetails }[]>([]);
    const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const { updateFiles } = chatHook.messageCrud;

    const toggleFileUpload = useCallback(() => {
        setShowFileUpload((prev) => !prev);
    }, []);

    const addFiles = useCallback(
        async (newFiles: { url: string; type: string; details?: EnhancedFileDetails }[]) => {
            try {
                setIsUploading(true);

                // Keep the full files with icons for local state
                const allFiles = [...files, ...newFiles];
                setFiles(allFiles);

                // Sanitize files for Redux by removing non-serializable 'icon'
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

                // Update Redux with sanitized files
                updateFiles(sanitizedFiles);
                setShowFileUpload(false);
            } catch (error) {
                console.error("Error adding files:", error);
            } finally {
                setIsUploading(false);
            }
        },
        [files, updateFiles]
    );

    const removeFile = useCallback(
        (index: number) => {
            setFiles((currentFiles) => {
                const newFiles = [...currentFiles];
                newFiles.splice(index, 1);
                // Update Redux with sanitized version
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
                updateFiles(sanitizedFiles);
                return newFiles;
            });
        },
        [updateFiles]
    );

    const clearFiles = useCallback(() => {
        setFiles([]);
        updateFiles([]);
    }, [updateFiles]);

    return {
        files,
        showFileUpload,
        isUploading,
        toggleFileUpload,
        addFiles,
        removeFile,
        clearFiles,
    };
}
