import React, { useState } from "react";
import { MultiFileUpload } from "./file-upload";
import { useFileUploadWithStorage } from "./useFileUploadWithStorage";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import { motion } from "framer-motion";

type FileUploadWithStorageProps = {
    bucket?: string;
    path?: string;
    onUploadComplete?: (results: { url: string; type: string; details?: EnhancedFileDetails }[]) => void;
    multiple?: boolean;
};

export const FileUploadWithStorage: React.FC<FileUploadWithStorageProps> = ({
    bucket = "userContent",
    path,
    onUploadComplete,
    multiple = false,
}) => {
    const { uploadFiles, isLoading } = useFileUploadWithStorage(bucket, path);
    const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

    const handleFilesChange = async (files: File[]) => {
        setUploadingFiles(files);
        const results = await uploadFiles(files);
        setUploadingFiles([]);
        
        if (results.length > 0 && onUploadComplete) {
            onUploadComplete(results);
        }
    };

    // Non-linear progress animation that starts fast then slows down
    const progressVariants = {
        progress: {
            width: ["3%", "29%", "60%", "75%", "85%", "92%"],
            transition: {
                times: [0, 0.2, 0.3, 0.4, 0.7, 1], // Non-linear timing
                duration: 8,                   // Slow overall duration
                ease: "easeOut",               // Further slows down at the end
                repeat: 0                      // No repeat, just one slow animation
            }
        }
    };

    // Return the original component wrapped with a container that adds the progress indicator
    return (
        <div>
            {/* Original component with no changes */}
            <MultiFileUpload onChange={handleFilesChange} multiple={multiple} />
            
            {/* Progress indicator below, completely independent of the original component */}
            {isLoading && uploadingFiles.length > 0 && (
                <div className="mt-6">
                    <div className="mb-2 flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <h3 className="text-sm font-medium">
                            Uploading {uploadingFiles.length} {uploadingFiles.length === 1 ? 'file' : 'files'}
                        </h3>
                    </div>
                    
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-4">
                        <div className="w-full h-3 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-blue-500"
                                initial={{ width: "0%" }}
                                animate="progress"
                                variants={progressVariants}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploadWithStorage;