import { useState, useCallback } from "react";
import FileSystemManager from "@/utils/file-operations/FileSystemManager";
import { EnhancedFileDetails, getFileDetailsByUrl } from "@/utils/file-operations/constants";
import { IconComponent, StorageMetadata } from "@/utils/file-operations/types";

// type FileCategory = "CODE" | "DOCUMENT" | "AUDIO" | "IMAGE" | "VIDEO" | "ARCHIVE" | "DATA" | "UNKNOWN" | "FOLDER";

// type EnhancedFileDetails = {
//     category: FileCategory;
//     subCategory: string;
//     icon: IconComponent;
//     color?: string;
//     canPreview?: boolean;
//     filename: string;
//     extension: string;
//     iconName: string;
//     bucket?: string;
//     path?: string;
//     quickPreview?: boolean;
//     mimetype?: string;
//     size?: number;
//     localId?: string;
// };

// Define the result type with optional new fields
interface UploadResult {
    url: string;
    type: string;
    details: EnhancedFileDetails;
    metadata?: StorageMetadata; // Optional to avoid breaking existing code
    localId?: string; // Optional to avoid breaking existing code
}

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
    const [results, setResults] = useState<UploadResult[]>([]);
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

                // Use the full uploadFile response
                const uploadResult = await fileSystemManager.uploadFile(bucket, filePath, file);
                if (!uploadResult.success) throw new Error(`Failed to upload ${file.name}`);

                const { signedUrl, metadata, localId } = uploadResult;
                if (!signedUrl) throw new Error(`No signed URL returned for ${file.name}`);

                const fileType = classifyFileType(file.type);
                const fileDetails = getFileDetailsByUrl(signedUrl, metadata, localId);

                const result: UploadResult = {
                    url: signedUrl,
                    type: fileType,
                    details: fileDetails,
                    metadata,
                };
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
                const uploadResults: UploadResult[] = [];

                for (const file of files) {
                    const filePath = path ? `${path}/${file.name}` : file.name;
                    const uploadResult = await fileSystemManager.uploadFile(bucket, filePath, file);

                    if (!uploadResult.success) throw new Error(`Failed to upload ${file.name}`);
                    const { signedUrl, metadata, localId } = uploadResult;
                    if (!signedUrl) throw new Error(`No signed URL returned for ${file.name}`);

                    const fileType = classifyFileType(file.type);
                    const fileDetails = getFileDetailsByUrl(signedUrl);

                    uploadResults.push({
                        url: signedUrl,
                        type: fileType,
                        details: fileDetails,
                        metadata,
                    });
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

    // New method to retrieve local file data
    const getLocalFile = useCallback(async (localId: string) => {
        try {
            const localFile = await fileSystemManager.getLocalFile(localId);
            return localFile; // Returns { blob, metadata, path, bucketName } or null
        } catch (err) {
            console.error(`Error retrieving local file for ${localId}:`, err);
            return null;
        }
    }, []);

    return {
        uploadFile,
        uploadFiles,
        getLocalFile, // Added for local item retrieval
        results,
        isLoading,
        error,
    };
};
