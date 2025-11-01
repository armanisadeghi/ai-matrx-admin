"use client";

import React, { useState, useCallback } from "react";
import { ChevronLeft, Upload, Image as ImageIcon, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";

interface UploadedFile {
    url: string;
    type: string;
    details?: EnhancedFileDetails;
}

interface UploadResourcePickerProps {
    onBack: () => void;
    onSelect: (files: UploadedFile[]) => void;
}

export function UploadResourcePicker({ onBack, onSelect }: UploadResourcePickerProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const { uploadMultipleToPrivateUserAssets } = useFileUploadWithStorage("userContent", "prompt-attachments");

    const handleFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        try {
            setIsUploading(true);
            const results = await uploadMultipleToPrivateUserAssets(files);
            
            if (results && results.length > 0) {
                onSelect(results);
            }
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setIsUploading(false);
        }
    }, [uploadMultipleToPrivateUserAssets, onSelect]);

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
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [handleFiles]);

    const openFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return (
        <div className="flex flex-col h-[400px]">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={onBack}
                    disabled={isUploading}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Upload className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                    Upload Files
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-4">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                />

                {/* Drop zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
                        isDragging
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                    }`}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-500" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">Uploading files...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-4 mb-4">
                                <ImageIcon className="w-12 h-12 text-gray-400" />
                                <File className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                Drop files here
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                                or click the button below to browse
                            </p>
                            <Button onClick={openFilePicker} className="h-9">
                                <Upload className="w-4 h-4 mr-2" />
                                Choose Files
                            </Button>
                        </>
                    )}
                </div>

                {/* Info */}
                <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                    <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Supported Files
                    </h4>
                    <ul className="text-[10px] text-blue-600 dark:text-blue-300 space-y-0.5">
                        <li>• Images: JPG, PNG, GIF, WebP, SVG</li>
                        <li>• Documents: PDF, DOC, DOCX, TXT, MD</li>
                        <li>• Media: MP3, MP4, WAV</li>
                        <li>• Data: CSV, JSON, XML</li>
                        <li>• Archives: ZIP, RAR</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

