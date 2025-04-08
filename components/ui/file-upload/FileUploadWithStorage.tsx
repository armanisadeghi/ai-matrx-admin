import React, { useState, useEffect } from "react";
import { MultiFileUpload, MiniFileUpload } from "./file-upload";
import { useFileUploadWithStorage } from "./useFileUploadWithStorage";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import { motion } from "framer-motion";

type FileUploadWithStorageProps = {
    bucket?: string;
    path?: string;
    onUploadComplete?: (results: { url: string; type: string; details?: EnhancedFileDetails }[]) => void;
    onUploadStatusChange?: (isUploading: boolean) => void;
    multiple?: boolean;
    useMiniUploader?: boolean; // New prop to toggle between normal and mini uploader
    maxHeight?: string; // Added to support the maxHeight prop for both uploaders
};

export const FileUploadWithStorage: React.FC<FileUploadWithStorageProps> = ({
    bucket = "userContent",
    path,
    onUploadComplete,
    onUploadStatusChange,
    multiple = false,
    useMiniUploader = false, // Default to regular uploader for backward compatibility
    maxHeight, // Pass this down to either uploader component
}) => {
    const { uploadFiles, isLoading } = useFileUploadWithStorage(bucket, path);
    const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

    useEffect(() => {
        if (onUploadStatusChange) {
            const isActivelyUploading = isLoading && uploadingFiles.length > 0;
            onUploadStatusChange(isActivelyUploading);
        }
    }, [isLoading, uploadingFiles.length, onUploadStatusChange]);

    const handleFilesChange = async (files: File[]) => {
        setUploadingFiles(files);
        
        try {
            const results = await uploadFiles(files);
            
            if (results.length > 0 && onUploadComplete) {
                onUploadComplete(results);
            }
        } catch (error) {
            console.error("🔧 Error in handleFilesChange:", error);
        } finally {
            setUploadingFiles([]);
        }
    };

    // Progress animation variants
    const progressVariants = {
        progress: {
            width: ["3%", "29%", "60%", "75%", "85%", "92%"],
            transition: {
                times: [0, 0.2, 0.3, 0.4, 0.7, 1],
                duration: 8,
                ease: "easeOut",
                repeat: 0
            }
        }
    };
    
    const isActivelyUploading = isLoading && uploadingFiles.length > 0;
    
    // Determine whether to use mini or regular progress indicator
    const ProgressIndicator = () => (
        <div className={`mt-${useMiniUploader ? '3' : '6'}`}>
            <div className="mb-2 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 className={`${useMiniUploader ? 'text-xs' : 'text-sm'} font-medium`}>
                    Uploading {uploadingFiles.length} {uploadingFiles.length === 1 ? 'file' : 'files'}
                </h3>
            </div>
            
            <div className={`bg-white dark:bg-neutral-800 rounded-lg shadow-sm ${useMiniUploader ? 'p-2' : 'p-4'}`}>
                <div className="w-full h-3 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    {(() => {
                        try {
                            return (
                                <motion.div 
                                    className="h-full bg-blue-500"
                                    initial={{ width: "0%" }}
                                    animate="progress"
                                    variants={progressVariants}
                                />
                            );
                        } catch (error) {
                            console.error("🔧 Error rendering motion.div:", error);
                            return <div className="h-full bg-blue-500 w-1/2"></div>;
                        }
                    })()}
                </div>
            </div>
        </div>
    );
    
    return (
        <div>
            {/* Conditionally render either the normal or mini uploader */}
            {useMiniUploader ? (
                <MiniFileUpload 
                    onChange={handleFilesChange} 
                    multiple={multiple}
                    maxHeight={maxHeight} 
                />
            ) : (
                <MultiFileUpload 
                    onChange={handleFilesChange} 
                    multiple={multiple}
                    maxHeight={maxHeight}
                />
            )}
            
            {/* Progress indicator */}
            {isActivelyUploading && <ProgressIndicator />}
        </div>
    );
};

export default FileUploadWithStorage;