"use client";

import React, { useState, useCallback, useRef } from "react";
import { ChevronLeft, Upload, Image as ImageIcon, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicFileUpload, PublicUploadResult } from "@/hooks/usePublicFileUpload";
import type { PublicResource, PublicResourceType } from "../../types/content";

interface PublicUploadResourcePickerProps {
    onBack: () => void;
    onSelect: (resources: PublicResource[]) => void;
}

export function PublicUploadResourcePicker({ onBack, onSelect }: PublicUploadResourcePickerProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use public file upload hook
    const { uploadFile, isUploading, error } = usePublicFileUpload({
        bucket: 'public-chat-uploads',
        path: 'chat-attachments',
        maxSizeMB: 10,
    });

    // Convert upload result to PublicResource
    const uploadResultToResource = useCallback((result: PublicUploadResult): PublicResource => {
        const mimeType = result.type || '';
        
        // Determine resource type based on mime type
        let resourceType: PublicResourceType = 'file';
        if (mimeType.startsWith('image/')) {
            resourceType = 'image_url';
        } else if (mimeType.startsWith('audio/')) {
            resourceType = 'audio';
        }

        return {
            type: resourceType,
            data: {
                url: result.url,
                filename: result.filename,
                mime_type: mimeType,
                size: result.size,
                type: mimeType,
            }
        };
    }, []);

    const handleFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        const resources: PublicResource[] = [];

        for (const file of files) {
            const result = await uploadFile(file);
            if (result) {
                resources.push(uploadResultToResource(result));
            }
        }

        if (resources.length > 0) {
            onSelect(resources);
        }
    }, [uploadFile, uploadResultToResource, onSelect]);

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
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
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
                    accept="image/*,audio/*,video/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileInputChange}
                    className="hidden"
                />

                {/* Error display */}
                {error && (
                    <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Drop zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-2 transition-colors ${
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
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                                <File className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">
                                Drop files here
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                                or click the button below to browse
                            </p>
                            <Button onClick={openFilePicker} className="h-8">
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
                        <li>• Documents: PDF, DOC, DOCX, TXT</li>
                        <li>• Audio: MP3, WAV, OGG</li>
                        <li>• Max size: 10MB per file</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
