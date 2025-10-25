"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Info, X } from "lucide-react";
import FileSystemManager from "@/utils/file-operations/FileSystemManager";
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
    const { toast } = useToast();

    // Get file from local storage or use the public URL
    useEffect(() => {
        const fetchFile = async () => {
            setIsLoading(true);
            setError(null);
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
                }
            }
            // If no local file, fetch from remote URL
            try {
                const response = await fetch(file.url);
                if (!response.ok) {
                    const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                    throw new Error(errorMsg);
                }
                const blob = await response.blob();
                setFileBlob(blob);
                setFileUrl(file.url); // Keep using the original URL
                setIsLoading(false);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                setIsLoading(false);
                
                // Show user-friendly toast notification
                toast({
                    title: "Failed to load file",
                    description: `Could not load file: ${errorMessage}. The file may be private or inaccessible.`,
                    variant: "destructive"
                });
            }
        };
        if (isOpen) {
            fetchFile();
        }
        return () => {
            // Clean up object URLs when component unmounts
            if (fileUrl && fileUrl.startsWith("blob:")) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [isOpen, file.url, file.details?.localId, toast]);

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

    // Render the title with icon and filename
    const renderTitle = () => {
        const fileName = file.details?.filename || "File";
        const Icon = file.details?.icon;
        return (
            <div className="flex items-center space-x-2">
                {Icon && <Icon className={file.details?.color ? `${file.details.color}` : ""} />}
                <span className="font-medium text-ellipsis overflow-hidden">{fileName}</span>
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

    // Render file metadata panel
    const renderFileDetails = () => {
        if (!file.details) return null;
        return (
            <div className={`bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 p-4 border-t ${showDetails ? "block" : "hidden"}`}>
                <h3 className="font-medium mb-2">File Details</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-gray-500 dark:text-gray-400">Type:</div>
                    <div className="col-span-2">{file.details.subCategory || file.details.category}</div>
                    {file.details.mimetype && (
                        <>
                            <div className="text-gray-500 dark:text-gray-400">MIME Type:</div>
                            <div className="col-span-2">{file.details.mimetype}</div>
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
                            <div className="col-span-2">{file.details.bucket}</div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Action buttons for the file
    const renderActionButtons = () => {
        return (
            <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => setShowDetails(!showDetails)}
                                aria-label="Toggle file details"
                            >
                                <Info size={22} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Toggle details</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                    !fileBlob ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={fileBlob ? handleDownload : undefined}
                                aria-label="Download file"
                            >
                                <Download size={22} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Download file</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                    !fileUrl ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={fileUrl ? () => window.open(fileUrl, "_blank") : undefined}
                                aria-label="Open in new tab"
                            >
                                <ExternalLink size={22} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Open in new tab</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={onClose}
                                aria-label="Close preview"
                            >
                                <X size={22} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Close</p>
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
            position="right"
            width="3xl"
            height="xl"
            title={renderTitle()}
            description={file.details?.subCategory || ""}
            showCloseButton={false}
            closeOnBackdropClick={true}
            rounded="lg"
            contentClassName="p-0 flex flex-col w-full"
            headerClassName="border-b px-2"
            footerContent={renderActionButtons()}
        >
            <div className="flex-1 overflow-auto relative w-full">{renderPreviewComponent()}</div>
            {renderFileDetails()}
        </FloatingSheet>
    );
};

export default FilePreviewSheet;
