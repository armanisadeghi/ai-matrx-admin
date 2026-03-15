"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle, File as FileIcon, Folder, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { AvailableBuckets, FileSystemNode } from "@/lib/redux/fileSystem/types";
import { formatBytes } from "@/components/ui/file-preview/utils/formatting";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Translate opaque Supabase/server error messages into human-readable explanations
function translateUploadError(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("payload too large") || lower.includes("entity too large") || lower.includes("413")) {
        return "File is too large for this storage bucket. Try compressing the file or splitting it into smaller parts before uploading.";
    }
    if (lower.includes("exceeded") && lower.includes("size")) {
        return "File exceeds the storage bucket size limit. Reduce the file size and try again.";
    }
    if (lower.includes("invalid mime type") || lower.includes("mime type not allowed")) {
        return "This file type is not allowed in this storage bucket. Check the supported file types and try again.";
    }
    if (lower.includes("not found") && lower.includes("bucket")) {
        return "Storage bucket not found. Please contact support.";
    }
    if (lower.includes("row-level security") || lower.includes("rls") || lower.includes("unauthorized") || lower.includes("403")) {
        return "You do not have permission to upload to this location. Make sure you are signed in and try again.";
    }
    if (lower.includes("duplicate") || lower.includes("already exists")) {
        return "A file with this name already exists at this location. Rename the file or choose a different folder.";
    }
    if (lower.includes("network") || lower.includes("failed to fetch") || lower.includes("timeout")) {
        return "Network error — the upload was interrupted. Check your connection and try again.";
    }
    return raw;
}

const WARN_THRESHOLD = 50 * 1024 * 1024; // 50 MB

interface FileUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    bucket: AvailableBuckets;
    initialPath?: string;
}

interface UploadingFile {
    file: File;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
}

interface FolderTreeItemProps {
    node: FileSystemNode;
    allNodes: FileSystemNode[];
    selectedPath: string;
    onSelect: (path: string) => void;
    level: number;
}

function FolderTreeItem({ node, allNodes, selectedPath, onSelect, level }: FolderTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const childFolders = allNodes.filter(n => n.parentId === node.itemId);
    const hasChildren = childFolders.length > 0;
    const isSelected = selectedPath === node.storagePath;

    return (
        <div>
            <button
                onClick={() => {
                    if (hasChildren) {
                        setIsExpanded(!isExpanded);
                    }
                    onSelect(node.storagePath);
                }}
                className={cn(
                    "w-full flex items-center gap-1 px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors text-left",
                    isSelected && "bg-accent",
                )}
                style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
            >
                {hasChildren && (
                    <span className="flex-shrink-0">
                        {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )}
                    </span>
                )}
                {!hasChildren && <span className="w-3" />}
                <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">{node.name}</span>
            </button>
            {isExpanded && hasChildren && (
                <div>
                    {childFolders.map(childNode => (
                        <FolderTreeItem
                            key={childNode.itemId}
                            node={childNode}
                            allNodes={allNodes}
                            selectedPath={selectedPath}
                            onSelect={onSelect}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FileUploadDialog({ isOpen, onClose, bucket, initialPath }: FileUploadDialogProps) {
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showFolderPicker, setShowFolderPicker] = useState(false);
    const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dispatch = useAppDispatch();
    
    const slice = createFileSystemSlice(bucket);
    const selectors = createFileSystemSelectors(bucket);
    const { actions } = slice;
    
    const allNodes = useAppSelector(selectors.selectAllNodes);
    const activeNode = useAppSelector(selectors.selectActiveNode);
    
    // Initialize selected folder path based on active node
    useEffect(() => {
        if (initialPath !== undefined) {
            setSelectedFolderPath(initialPath);
        } else if (activeNode) {
            // If activeNode is a folder, use it; if it's a file, use its parent
            if (activeNode.contentType === 'FOLDER') {
                setSelectedFolderPath(activeNode.storagePath);
            } else if (activeNode.parentId && activeNode.parentId !== 'root') {
                const parentNode = allNodes.find(n => n.itemId === activeNode.parentId);
                setSelectedFolderPath(parentNode?.storagePath || "");
            } else {
                setSelectedFolderPath("");
            }
        } else {
            setSelectedFolderPath("");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPath, activeNode?.itemId, activeNode?.contentType, activeNode?.storagePath, activeNode?.parentId]);

    const handleFiles = useCallback((files: File[]) => {
        if (files.length === 0) return;
        setUploadingFiles(files.map(file => ({ file, status: "pending" as const })));
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        handleFiles(files);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [handleFiles]);

    const openFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleRemoveFile = useCallback((index: number) => {
        setUploadingFiles(files => files.filter((_, i) => i !== index));
    }, []);

    const handleUpload = useCallback(async () => {
        if (uploadingFiles.length === 0) return;

        setIsUploading(true);
        const updatedFiles: UploadingFile[] = [...uploadingFiles];

        for (let i = 0; i < updatedFiles.length; i++) {
            updatedFiles[i] = { ...updatedFiles[i], status: "uploading" };
            setUploadingFiles([...updatedFiles]);

            try {
                await dispatch(actions.uploadFile({ 
                    file: updatedFiles[i].file,
                    options: {
                        targetPath: selectedFolderPath // Pass the selected folder path
                    }
                })).unwrap();
                updatedFiles[i] = { ...updatedFiles[i], status: "success" };
            } catch (error) {
                console.error("Upload error:", error);
                const rawMessage = error instanceof Error ? error.message : "Upload failed";
                updatedFiles[i] = {
                    ...updatedFiles[i],
                    status: "error",
                    error: translateUploadError(rawMessage),
                };
            }
            setUploadingFiles([...updatedFiles]);
        }

        setIsUploading(false);

        // Refresh the file list
        await dispatch(actions.listContents({ forceFetch: true }));

        const successCount = updatedFiles.filter(f => f.status === "success").length;
        const errorCount = updatedFiles.filter(f => f.status === "error").length;

        if (successCount > 0) {
            toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
        }

        if (errorCount > 0) {
            toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? "s" : ""}`);
        }

        // Close after a delay if all succeeded
        if (errorCount === 0) {
            setTimeout(() => {
                handleClose();
            }, 1500);
        }
    }, [uploadingFiles, dispatch, actions, selectedFolderPath]);

    const handleClose = useCallback(() => {
        if (!isUploading) {
            setUploadingFiles([]);
            setIsDragging(false);
            onClose();
        }
    }, [isUploading, onClose]);

    const allComplete = uploadingFiles.every(f => f.status === "success" || f.status === "error");

    // Format the destination path for display
    const displayPath = selectedFolderPath 
        ? `${bucket}/${selectedFolderPath}` 
        : `${bucket} (root)`;
    
    // Get folder nodes for the tree
    const folderNodes = allNodes.filter(node => node.contentType === 'FOLDER');
    
    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                    <DialogDescription>
                        Choose files to upload to your storage
                    </DialogDescription>
                </DialogHeader>

                {/* Destination Path Display */}
                <div className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Uploading to:</p>
                            <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <p className="text-sm font-medium truncate">{displayPath}</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFolderPicker(!showFolderPicker)}
                            disabled={isUploading}
                            className="flex-shrink-0"
                        >
                            {showFolderPicker ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                            Change
                        </Button>
                    </div>
                </div>

                {/* Folder Picker */}
                {showFolderPicker && (
                    <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto bg-background">
                        <p className="text-xs text-muted-foreground mb-2">Select destination folder:</p>
                        <div className="space-y-0.5">
                            {/* Root option */}
                            <button
                                onClick={() => {
                                    setSelectedFolderPath("");
                                    setShowFolderPicker(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors text-left",
                                    selectedFolderPath === "" && "bg-accent"
                                )}
                            >
                                <Folder className="h-4 w-4 text-blue-500" />
                                <span>{bucket} (root)</span>
                            </button>
                            
                            {/* Folder tree */}
                            {folderNodes
                                .filter(node => node.parentId === "root")
                                .map(node => (
                                    <FolderTreeItem
                                        key={node.itemId}
                                        node={node}
                                        allNodes={folderNodes}
                                        selectedPath={selectedFolderPath}
                                        onSelect={(path) => {
                                            setSelectedFolderPath(path);
                                            setShowFolderPicker(false);
                                        }}
                                        level={0}
                                    />
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                />

                {/* Upload Area or Files List */}
                {uploadingFiles.length === 0 ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors ${
                            isDragging
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                                : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                        }`}
                    >
                        <div className="flex gap-4 mb-4">
                            <FileIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Drop files here
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                            or click the button below to browse
                        </p>
                        <Button onClick={openFilePicker}>
                            <Upload className="w-4 h-4 mr-2" />
                            Choose Files
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Large-file warning */}
                        {uploadingFiles.some(f => f.status === "pending" && f.file.size > WARN_THRESHOLD) && (
                            <Alert className="py-2">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <AlertTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400">Large Files Detected</AlertTitle>
                                <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                                    {uploadingFiles
                                        .filter(f => f.status === "pending" && f.file.size > WARN_THRESHOLD)
                                        .map(f => `${f.file.name} (${formatBytes(f.file.size)})`)
                                        .join(", ")}
                                    {" "}may fail if the storage bucket has a size limit. If upload fails, compress or split the file before retrying.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Files List */}
                        <div className="max-h-[400px] overflow-y-auto space-y-2">
                            {uploadingFiles.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                                >
                                    {/* Status Icon */}
                                    <div className="flex-shrink-0 mt-0.5">
                                        {item.status === "pending" && (
                                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                                        )}
                                        {item.status === "uploading" && (
                                            <Loader2 size={20} className="animate-spin text-primary" />
                                        )}
                                        {item.status === "success" && (
                                            <CheckCircle2 size={20} className="text-green-500" />
                                        )}
                                        {item.status === "error" && (
                                            <AlertCircle size={20} className="text-destructive" />
                                        )}
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {item.file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatBytes(item.file.size)}
                                        </p>
                                        {item.error && (
                                            <p className="text-xs text-destructive mt-1">{item.error}</p>
                                        )}
                                    </div>

                                    {/* Remove Button */}
                                    {item.status === "pending" && !isUploading && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveFile(index)}
                                            className="flex-shrink-0 h-8 w-8"
                                        >
                                            <X size={16} />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-4">
                            {!allComplete ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={handleClose}
                                        disabled={isUploading}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={isUploading || uploadingFiles.length === 0}
                                        className="flex-1"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 size={16} className="mr-2 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={16} className="mr-2" />
                                                Upload {uploadingFiles.length} File
                                                {uploadingFiles.length !== 1 ? "s" : ""}
                                            </>
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={handleClose} className="w-full">
                                    Done
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

