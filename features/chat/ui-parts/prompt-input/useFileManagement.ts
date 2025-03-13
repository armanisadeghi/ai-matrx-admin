import { useState, useCallback } from "react";
import { ConversationWithRoutingResult } from "@/hooks/ai/chat/useConversationWithRouting";

interface FileManagementResult {
    files: { url: string; type: string }[];
    showFileUpload: boolean;
    isUploading: boolean;
    toggleFileUpload: () => void;
    addFiles: (newFiles: { url: string; type: string }[]) => Promise<void>;
    removeFile: (index: number) => void;
    clearFiles: () => void;
}

export function useFileManagement(chatHook: ConversationWithRoutingResult): FileManagementResult {

    // State
    const [files, setFiles] = useState<{ url: string; type: string }[]>([]);
    const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const { updateFiles } = chatHook.messageCrud;

    const toggleFileUpload = useCallback(() => {
        setShowFileUpload((prev) => !prev);
    }, []);

    const addFiles = useCallback(
        async (newFiles: { url: string; type: string }[]) => {
            try {
                setIsUploading(true);
                const allFiles = [...files, ...newFiles];


                setFiles(allFiles);
                updateFiles(allFiles);
                setShowFileUpload(false);
            } catch (error) {
                console.error("Error adding files:", error);
            } finally {
                setIsUploading(false);
            }
        },
        [files]
    );

    const removeFile = useCallback((index: number) => {
        setFiles((currentFiles) => {
            const newFiles = [...currentFiles];
            newFiles.splice(index, 1);
            return newFiles;
        });
    }, []);

    const clearFiles = useCallback(() => {
        setFiles([]);
    }, []);


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
