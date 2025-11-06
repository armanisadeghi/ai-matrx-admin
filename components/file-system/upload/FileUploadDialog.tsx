"use client";

import React, { useState, useCallback, useRef } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch } from "@/lib/redux/hooks";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { AvailableBuckets } from "@/lib/redux/fileSystem/types";
import { formatBytes } from "@/components/ui/file-preview/utils/formatting";
import { toast } from "sonner";

interface FileUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    bucket: AvailableBuckets;
}

interface UploadingFile {
    file: File;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
}

export function FileUploadDialog({ isOpen, onClose, bucket }: FileUploadDialogProps) {
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dispatch = useAppDispatch();
    
    const slice = createFileSystemSlice(bucket);
    const { actions } = slice;

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
                await dispatch(actions.uploadFile({ file: updatedFiles[i].file })).unwrap();
                updatedFiles[i] = { ...updatedFiles[i], status: "success" };
            } catch (error) {
                console.error("Upload error:", error);
                updatedFiles[i] = {
                    ...updatedFiles[i],
                    status: "error",
                    error: error instanceof Error ? error.message : "Upload failed",
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
    }, [uploadingFiles, dispatch, actions]);

    const handleClose = useCallback(() => {
        if (!isUploading) {
            setUploadingFiles([]);
            setIsDragging(false);
            onClose();
        }
    }, [isUploading, onClose]);

    const allComplete = uploadingFiles.every(f => f.status === "success" || f.status === "error");

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                    <DialogDescription>
                        Upload files to <span className="font-medium">{bucket}</span> bucket
                    </DialogDescription>
                </DialogHeader>

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

