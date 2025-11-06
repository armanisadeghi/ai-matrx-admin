"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Info, X, Maximize, Minimize, Edit, Copy, FileInput, Link, Share2, Trash2 } from "lucide-react";
import FileSystemManager from "@/utils/file-operations/FileSystemManager";
import { fetchWithUrlRefresh, createUrlMetadata } from "@/utils/file-operations/urlRefreshUtils";
import FloatingSheet from "@/components/ui/matrx/FloatingSheet";
import ImagePreview from "./previews/ImagePreview";
import TextPreview from "./previews/TextPreview";
import CodePreview from "./previews/CodePreview";
import GenericPreview from "./previews/GenericPreview";
import VideoPreview from "./previews/VideoPreview";
import AudioPreview from "./previews/AudioPreview";
import DataPreview from "./previews/DataPreview";
import PDFPreview from "./previews/PDFPreview";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import { formatBytes } from "./utils/formatting";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui";
import { Input } from "@/components/ui/input";

interface FilePreviewSheetProps {
    isOpen: boolean;
    onClose: () => void;
    file: {
        url: string;
        type: string;
        details?: EnhancedFileDetails;
    };
}

const FilePreviewSheet: React.FC<FilePreviewSheetProps> = ({ isOpen, onClose, file }) => {
    const [fileBlob, setFileBlob] = useState<Blob | null>(null);
    const [fileUrl, setFileUrl] = useState<string>(file.url);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [isRenaming, setIsRenaming] = useState<boolean>(false);
    const [newFileName, setNewFileName] = useState<string>("");
    const { toast } = useToast();

    // Get file from local storage or use the public URL with automatic refresh on expiry
    useEffect(() => {
        const fetchFile = async () => {
            setIsLoading(true);
            setError(null);
            
            // First, try to get from local storage (instant access)
            if (file.details?.localId) {
                try {
                    const fileSystemManager = FileSystemManager.getInstance();
                    const localFile = await fileSystemManager.getLocalFile(file.details.localId);
                    if (localFile?.blob) {
                        const localUrl = URL.createObjectURL(localFile.blob);
                        setFileUrl(localUrl);
                        setFileBlob(localFile.blob);
                        setIsLoading(false);
                        return;
                    }
                } catch (err) {
                    // Silently fall back to remote URL - this is expected for files not in local storage
                    console.debug('Local file not found, fetching from remote');
                }
            }
            
            // If no local file, fetch from remote URL with automatic refresh
            try {
                // Create URL metadata for automatic refresh handling
                const urlMetadata = createUrlMetadata(
                    file.url,
                    file.details?.bucket,
                    file.details?.path,
                    file.details?.expiresAt,
                    file.details?.isPublic
                );

                // Use fetchWithUrlRefresh for automatic URL expiration handling
                const result = await fetchWithUrlRefresh(urlMetadata, {
                    expiresIn: 3600, // 1 hour
                    maxRetries: 3
                });

                setFileBlob(result.blob);
                setFileUrl(result.url); // Use the potentially refreshed URL
                setIsLoading(false);

                // Log if URL was refreshed
                if (result.refreshed) {
                    console.log('File URL was automatically refreshed');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                setIsLoading(false);
                
                // Show user-friendly toast notification
                toast({
                    title: "Failed to load file",
                    description: file.details?.bucket && file.details?.path 
                        ? `Could not load file after multiple attempts. Please try again.`
                        : `Could not load file: ${errorMessage}. The file may be private or inaccessible.`,
                    variant: "destructive"
                });
            }
        };
        
        if (isOpen && file.url) {
            fetchFile();
        }
        
        return () => {
            // Clean up object URLs when component unmounts
            if (fileUrl && fileUrl.startsWith("blob:")) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [isOpen, file.url, file.details?.localId, file.details?.bucket, file.details?.path, toast]);

    // Determine which preview component to render based on file category and extension
    const renderPreviewComponent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Loading file preview...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                    <X className="h-12 w-12 text-destructive" />
                    <div>
                        <p className="text-sm font-medium text-destructive mb-1">Failed to load file</p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                        <p className="text-xs text-muted-foreground mt-2">The file may be private or inaccessible.</p>
                    </div>
                </div>
            );
        }
        const category = file.details?.category || "UNKNOWN";
        const extension = file.details?.extension?.toLowerCase() || "";
        const mimeType = file.details?.mimetype || file.type;

        // Create a preview props object with all necessary data
        const previewProps = {
            file: {
                ...file,
                url: fileUrl,
                blob: fileBlob,
            },
            isLoading,
        };

        switch (category) {
            case "IMAGE":
                return <ImagePreview {...previewProps} />;
            case "VIDEO":
                return <VideoPreview {...previewProps} />;
            case "AUDIO":
                return <AudioPreview {...previewProps} />;
            case "DOCUMENT":
                if (extension === "pdf") {
                    return <PDFPreview {...previewProps} />;
                } else if (["xlsx", "xls"].includes(extension)) {
                    return <DataPreview {...previewProps} />;
                } else if (extension === "txt" || file.details?.subCategory === "TEXT") {
                    return <TextPreview {...previewProps} />;
                }
                return <GenericPreview {...previewProps} />;
            case "CODE":
                return <CodePreview {...previewProps} />;
            case "DATA":
                if (["json", "csv", "xlsx", "xls"].includes(extension)) {
                    return <DataPreview {...previewProps} />;
                }
                return <GenericPreview {...previewProps} />;
            default:
                return <GenericPreview {...previewProps} />;
        }
    };

    // Handle rename
    const handleRename = useCallback(async () => {
        if (!newFileName.trim() || !file.details?.bucket || !file.details?.path) return;
        
        try {
            const fileSystemManager = FileSystemManager.getInstance();
            const oldPath = file.details.path;
            const pathParts = oldPath.split('/');
            const oldFileName = pathParts[pathParts.length - 1];
            
            // Parse extensions
            const oldExtension = oldFileName.includes('.') ? oldFileName.split('.').pop() : '';
            const newNameTrimmed = newFileName.trim();
            const newExtension = newNameTrimmed.includes('.') ? newNameTrimmed.split('.').pop() : '';
            
            // If user didn't include extension, preserve the original extension
            let finalFileName = newNameTrimmed;
            if (oldExtension && !newExtension) {
                finalFileName = `${newNameTrimmed}.${oldExtension}`;
            }
            
            pathParts[pathParts.length - 1] = finalFileName;
            const newPath = pathParts.join('/');
            
            const success = await fileSystemManager.renameFile(
                file.details.bucket,
                oldPath,
                newPath
            );
            
            if (success) {
                toast({
                    title: "Success",
                    description: "File renamed successfully"
                });
                setIsRenaming(false);
                
                // Refresh the file tree by reloading bucket structure
                await fileSystemManager.loadBucketStructure(file.details.bucket, true);
            } else {
                throw new Error("Rename failed");
            }
        } catch (error) {
            console.error('Rename failed:', error);
            toast({
                title: "Error",
                description: "Failed to rename file",
                variant: "destructive"
            });
        }
    }, [newFileName, file.details, toast]);

    // Render the title with icon, filename, and inline rename button
    const renderTitle = () => {
        const fileName = file.details?.filename || "File";
        const Icon = file.details?.icon;
        
        if (isRenaming) {
            return (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {Icon && <Icon className={`flex-shrink-0 w-[18px] h-[18px] ${file.details?.color ? `${file.details.color}` : ""}`} />}
                    <Input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRename();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setIsRenaming(false);
                            }
                        }}
                        onBlur={() => {
                            // Don't cancel on blur - let Enter/Escape handle it
                            // This prevents accidental cancellation
                        }}
                        autoFocus
                        className="h-7 text-sm font-medium flex-1 min-w-0"
                    />
                </div>
            );
        }
        
        return (
            <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon className={`flex-shrink-0 w-[18px] h-[18px] ${file.details?.color ? `${file.details.color}` : ""}`} />}
                <span className="font-medium truncate">{fileName}</span>
                {file.details?.bucket && file.details?.path && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="p-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1"
                                    onClick={() => {
                                        // Get filename without extension for editing
                                        const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
                                        const nameWithoutExt = extension && fileName.endsWith(`.${extension}`) 
                                            ? fileName.substring(0, fileName.length - extension.length - 1)
                                            : fileName;
                                        setNewFileName(nameWithoutExt);
                                        setIsRenaming(true);
                                    }}
                                    aria-label="Rename file"
                                >
                                    <Edit size={14} />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Rename</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        );
    };

    // Handle file download
    const handleDownload = useCallback(() => {
        if (!fileBlob) return;
        const fileName = file.details?.filename || "download";
        const downloadUrl = URL.createObjectURL(fileBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }, [fileBlob, file.details?.filename]);

    // Handle copy public link
    const handleCopyLink = useCallback(async () => {
        if (!file.details?.bucket || !file.details?.path) return;
        
        try {
            const fileSystemManager = FileSystemManager.getInstance();
            const urlResult = await fileSystemManager.getFileUrl(
                file.details.bucket as any,
                file.details.path,
                { expiresIn: 3600 }
            );
            
            await navigator.clipboard.writeText(urlResult.url);
            toast({
                title: "Success",
                description: "Link copied to clipboard"
            });
        } catch (error) {
            console.error('Copy link failed:', error);
            toast({
                title: "Error",
                description: "Failed to copy link",
                variant: "destructive"
            });
        }
    }, [file.details, toast]);

    // Handle duplicate
    const handleDuplicate = useCallback(async () => {
        if (!file.details?.bucket || !file.details?.path) return;
        
        try {
            const fileSystemManager = FileSystemManager.getInstance();
            const oldPath = file.details.path;
            const pathParts = oldPath.split('/');
            const fileName = pathParts[pathParts.length - 1];
            const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
            const nameWithoutExt = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
            const newFileName = extension ? `${nameWithoutExt}_copy.${extension}` : `${nameWithoutExt}_copy`;
            pathParts[pathParts.length - 1] = newFileName;
            const newPath = pathParts.join('/');
            
            const success = await fileSystemManager.copyFile(
                file.details.bucket,
                oldPath,
                newPath
            );
            
            if (success) {
                toast({
                    title: "Success",
                    description: "File duplicated successfully"
                });
            } else {
                throw new Error("Duplicate failed");
            }
        } catch (error) {
            console.error('Duplicate failed:', error);
            toast({
                title: "Error",
                description: "Failed to duplicate file",
                variant: "destructive"
            });
        }
    }, [file.details, toast]);

    // Handle delete
    const handleDelete = useCallback(async () => {
        if (!file.details?.bucket || !file.details?.path) return;
        
        const confirmed = window.confirm(`Are you sure you want to delete ${file.details.filename}?`);
        if (!confirmed) return;
        
        try {
            const fileSystemManager = FileSystemManager.getInstance();
            const success = await fileSystemManager.deleteFile(
                file.details.bucket,
                file.details.path
            );
            
            if (success) {
                toast({
                    title: "Success",
                    description: "File deleted successfully"
                });
                onClose();
            } else {
                throw new Error("Delete failed");
            }
        } catch (error) {
            console.error('Delete failed:', error);
            toast({
                title: "Error",
                description: "Failed to delete file",
                variant: "destructive"
            });
        }
    }, [file.details, toast, onClose]);

    // Render file metadata panel
    const renderFileDetails = () => {
        if (!file.details) return null;
        return (
            <div className={`bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 p-3 border-t ${showDetails ? "block" : "hidden"}`}>
                <h3 className="font-medium mb-2 text-sm">File Details</h3>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                    <div className="text-gray-500 dark:text-gray-400">Type:</div>
                    <div className="col-span-2">{file.details.subCategory || file.details.category}</div>
                    {file.details.mimetype && (
                        <>
                            <div className="text-gray-500 dark:text-gray-400">MIME:</div>
                            <div className="col-span-2 truncate">{file.details.mimetype}</div>
                        </>
                    )}
                    {file.details.size && (
                        <>
                            <div className="text-gray-500 dark:text-gray-400">Size:</div>
                            <div className="col-span-2">{formatBytes(file.details.size)}</div>
                        </>
                    )}
                    {file.details.extension && (
                        <>
                            <div className="text-gray-500 dark:text-gray-400">Extension:</div>
                            <div className="col-span-2">.{file.details.extension}</div>
                        </>
                    )}
                    {file.details.path && (
                        <>
                            <div className="text-gray-500 dark:text-gray-400">Path:</div>
                            <div className="col-span-2 truncate">{file.details.path}</div>
                        </>
                    )}
                    {file.details.bucket && (
                        <>
                            <div className="text-gray-500 dark:text-gray-400">Bucket:</div>
                            <div className="col-span-2 truncate">{file.details.bucket}</div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Action buttons for the file
    const renderActionButtons = () => {
        const hasFileOperations = file.details?.bucket && file.details?.path;
        
        return (
            <div className="flex items-center gap-1 flex-wrap">
                {/* View/Display Controls */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="p-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                aria-label="Toggle fullscreen"
                            >
                                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="p-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setShowDetails(!showDetails)}
                                aria-label="Toggle file details"
                            >
                                <Info size={18} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            File info
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="h-5 w-px bg-border mx-1" />

                {/* File Operations */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`p-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                    !fileBlob ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={fileBlob ? handleDownload : undefined}
                                aria-label="Download file"
                            >
                                <Download size={18} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Download
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`p-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                    !hasFileOperations ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={hasFileOperations ? handleCopyLink : undefined}
                                aria-label="Copy link"
                            >
                                <Link size={18} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Copy link
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`p-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                    !fileUrl ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={fileUrl ? () => window.open(fileUrl, "_blank") : undefined}
                                aria-label="Open in new tab"
                            >
                                <ExternalLink size={18} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Open in new tab
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="h-5 w-px bg-border mx-1" />

                {/* Editing Operations */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`p-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                    !hasFileOperations ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={hasFileOperations ? handleDuplicate : undefined}
                                aria-label="Duplicate file"
                            >
                                <Copy size={18} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Duplicate
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="h-5 w-px bg-border mx-1" />

                {/* Destructive Operations */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`p-1.5 rounded cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors ${
                                    !hasFileOperations ? "opacity-50 cursor-not-allowed" : "text-destructive"
                                }`}
                                onClick={hasFileOperations ? handleDelete : undefined}
                                aria-label="Delete file"
                            >
                                <Trash2 size={18} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Delete
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="h-5 w-px bg-border mx-1" />

                {/* Close */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="p-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={onClose}
                                aria-label="Close preview"
                            >
                                <X size={18} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Close
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    };

    return (
        <FloatingSheet
            isOpen={isOpen}
            onClose={onClose}
            position={isFullscreen ? "center" : "right"}
            width={isFullscreen ? "full" : "3xl"}
            height={isFullscreen ? "full" : "xl"}
            title={renderTitle()}
            description=""
            showCloseButton={false}
            closeOnBackdropClick={!isFullscreen}
            rounded={isFullscreen ? "none" : "lg"}
            spacing={isFullscreen ? "0" : "0"}
            contentClassName="p-0 flex flex-col w-full"
            headerClassName="border-b px-2 py-2 min-h-0"
            footerClassName="border-t px-2 py-2 min-h-0"
            footerContent={renderActionButtons()}
        >
            <div className="flex-1 overflow-auto relative w-full">{renderPreviewComponent()}</div>
            {renderFileDetails()}
        </FloatingSheet>
    );
};

export default FilePreviewSheet;
