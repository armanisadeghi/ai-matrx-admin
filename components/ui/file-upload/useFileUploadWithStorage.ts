import { useState, useCallback } from "react";
import FileSystemManager from "@/utils/file-operations/FileSystemManager";

const classifyFileType = (mimeType: string): string => {
    if (!mimeType) return "unknown";

    const type = mimeType.toLowerCase();
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("text/") || type === "application/json") return "text";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type === "application/pdf") return "pdf";
    return "other";
};

export const useFileUploadWithStorage = (bucket: string, path?: string) => {
    const [results, setResults] = useState<{ url: string; type: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileSystemManager = FileSystemManager.getInstance();

    const ensureFolderExists = useCallback(
        async (folderPath: string) => {
            if (!folderPath) return true;

            const pathSegments = folderPath.split("/").filter((segment) => segment.length > 0);
            let currentPath = "";

            for (const segment of pathSegments) {
                currentPath = currentPath ? `${currentPath}/${segment}` : segment;
                const { data, error } = await fileSystemManager.getSupabase().storage.from(bucket).list(currentPath);

                if (error && error.message.includes("not found")) {
                    const success = await fileSystemManager.createFolder(bucket, currentPath);
                    if (!success) throw new Error(`Failed to create folder: ${currentPath}`);
                } else if (error) {
                    throw error;
                }
            }
            return true;
        },
        [bucket]
    );

    const uploadFile = useCallback(
        async (file: File) => {
            try {
                setIsLoading(true);
                setError(null);

                await ensureFolderExists(path || "");
                const filePath = path ? `${path}/${file.name}` : file.name;

                const success = await fileSystemManager.uploadFile(bucket, filePath, file);
                if (!success) throw new Error(`Failed to upload ${file.name}`);

                const publicUrl = await fileSystemManager.getPublicUrl(bucket, filePath);
                const fileType = classifyFileType(file.type);

                const result = { url: publicUrl, type: fileType };
                setResults((prev) => [...prev, result]);
                return result;
            } catch (err) {
                setError(err.message || "Upload failed");
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [bucket, path, ensureFolderExists]
    );

    const uploadFiles = useCallback(
        async (files: File[]) => {
            try {
                setIsLoading(true);
                setError(null);

                await ensureFolderExists(path || "");
                const uploadResults: { url: string; type: string }[] = [];

                for (const file of files) {
                    const filePath = path ? `${path}/${file.name}` : file.name;
                    const success = await fileSystemManager.uploadFile(bucket, filePath, file);

                    if (success) {
                        const publicUrl = await fileSystemManager.getPublicUrl(bucket, filePath);
                        const fileType = classifyFileType(file.type);
                        uploadResults.push({ url: publicUrl, type: fileType });
                    } else {
                        throw new Error(`Failed to upload ${file.name}`);
                    }
                }

                setResults(uploadResults);
                return uploadResults;
            } catch (err) {
                setError(err.message || "Batch upload failed");
                return [];
            } finally {
                setIsLoading(false);
            }
        },
        [bucket, path, ensureFolderExists]
    );

    return {
        uploadFile,
        uploadFiles,
        results, // Now returns array of { url, type } objects
        isLoading,
        error,
    };
};
