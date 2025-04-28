import { useState, useCallback } from "react";
import FileSystemManager from "@/utils/file-operations/FileSystemManager";
import { EnhancedFileDetails, getFileDetailsByUrl } from "@/utils/file-operations/constants";
import { IconComponent, StorageMetadata } from "@/utils/file-operations/types";
import { useAppSelector } from "@/lib/redux";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";

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

    const userId = useAppSelector(selectUserId);
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

    const getLocalFile = useCallback(async (localId: string) => {
        try {
            const localFile = await fileSystemManager.getLocalFile(localId);
            return localFile;
        } catch (err) {
            console.error(`Error retrieving local file for ${localId}:`, err);
            return null;
        }
    }, []);

    // New method to create user-specific directories
    const createUserDirectories = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (!userId) throw new Error("User ID is not available");

            const success = await fileSystemManager.createUserDirectories(userId);
            if (!success) throw new Error("Failed to create user directories");

            return true;
        } catch (err) {
            setError(err.message || "Failed to create user directories");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // New method to upload a single file to public user assets
    const uploadToPublicUserAssets = useCallback(
        async (file: File) => {
            try {
                setIsLoading(true);
                setError(null);

                if (!userId) throw new Error("User ID is not available");

                const bucket = "user-public-assets";
                const userDir = `user-${userId}`;
                const filePath = `${userDir}/${file.name}`;

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
                    localId,
                };
                setResults((prev) => [...prev, result]);

                return result;
            } catch (err) {
                setError(err.message || "Upload to public assets failed");
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [userId]
    );

    // New method to upload multiple files to public user assets
    const uploadMultipleToPublicUserAssets = useCallback(
        async (files: File[]) => {
            try {
                setIsLoading(true);
                setError(null);

                if (!userId) throw new Error("User ID is not available");

                const bucket = "user-public-assets";
                const userDir = `user-${userId}`;
                const uploadResults: UploadResult[] = [];

                for (const file of files) {
                    const filePath = `${userDir}/${file.name}`;
                    const uploadResult = await fileSystemManager.uploadFile(bucket, filePath, file);

                    if (!uploadResult.success) throw new Error(`Failed to upload ${file.name}`);
                    const { signedUrl, metadata, localId } = uploadResult;
                    if (!signedUrl) throw new Error(`No signed URL returned for ${file.name}`);

                    const fileType = classifyFileType(file.type);
                    const fileDetails = getFileDetailsByUrl(signedUrl, metadata, localId);

                    uploadResults.push({
                        url: signedUrl,
                        type: fileType,
                        details: fileDetails,
                        metadata,
                        localId,
                    });
                }

                setResults(uploadResults);
                return uploadResults;
            } catch (err) {
                setError(err.message || "Batch upload to public assets failed");
                return [];
            } finally {
                setIsLoading(false);
            }
        },
        [userId]
    );

    // New method to upload a single file to private user assets
    const uploadToPrivateUserAssets = useCallback(
        async (file: File) => {
            try {
                setIsLoading(true);
                setError(null);

                if (!userId) throw new Error("User ID is not available");

                const bucket = "user-private-assets";
                const userDir = `user-${userId}`;
                const filePath = `${userDir}/${file.name}`;

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
                    localId,
                };
                setResults((prev) => [...prev, result]);

                return result;
            } catch (err) {
                setError(err.message || "Upload to private assets failed");
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [userId]
    );

    // New method to upload multiple files to private user assets
    const uploadMultipleToPrivateUserAssets = useCallback(
        async (files: File[]) => {
            try {
                setIsLoading(true);
                setError(null);

                if (!userId) throw new Error("User ID is not available");

                const bucket = "user-private-assets";
                const userDir = `user-${userId}`;
                const uploadResults: UploadResult[] = [];

                for (const file of files) {
                    const filePath = `${userDir}/${file.name}`;
                    const uploadResult = await fileSystemManager.uploadFile(bucket, filePath, file);

                    if (!uploadResult.success) throw new Error(`Failed to upload ${file.name}`);
                    const { signedUrl, metadata, localId } = uploadResult;
                    if (!signedUrl) throw new Error(`No signed URL returned for ${file.name}`);

                    const fileType = classifyFileType(file.type);
                    const fileDetails = getFileDetailsByUrl(signedUrl, metadata, localId);

                    uploadResults.push({
                        url: signedUrl,
                        type: fileType,
                        details: fileDetails,
                        metadata,
                        localId,
                    });
                }

                setResults(uploadResults);
                return uploadResults;
            } catch (err) {
                setError(err.message || "Batch upload to private assets failed");
                return [];
            } finally {
                setIsLoading(false);
            }
        },
        [userId]
    );

    return {
        uploadFile,
        uploadFiles,
        getLocalFile,
        createUserDirectories, // New method to create user directories
        uploadToPublicUserAssets, // New method for single public upload
        uploadMultipleToPublicUserAssets, // New method for multiple public uploads
        uploadToPrivateUserAssets, // New method for single private upload
        uploadMultipleToPrivateUserAssets, // New method for multiple private uploads
        results,
        isLoading,
        error,
    };
};