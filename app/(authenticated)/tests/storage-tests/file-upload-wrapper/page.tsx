"use client";

import React, { useState } from "react";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import FileChipsWithPreview from "@/components/ui/file-preview/FileChipsWithPreview";

export default function FileUploadWrapper() {
    const [uploadedFiles, setUploadedFiles] = useState<{ url: string; type: string }[]>([]);

    const handleUploadComplete = (results: { url: string; type: string }[]) => {
        console.log("Uploaded files:", results);
        setUploadedFiles((prev) => [...prev, ...results]);
    };

    const handleRemoveFile = (index: number) => {
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">File Upload Demo</h1>

            {/* Single file upload to userContent bucket */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Single File Upload (userContent)</h2>
                <FileUploadWithStorage bucket="userContent" path="myfolder/subfolder" onUploadComplete={handleUploadComplete} />
            </div>

            {/* Multiple file upload to any-file bucket */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Multiple File Upload (any-file)</h2>
                <FileUploadWithStorage bucket="any-file" path="test/batch" onUploadComplete={handleUploadComplete} multiple />
            </div>

            {/* Display uploaded files as chips */}
            {uploadedFiles.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-2">Uploaded Files</h2>
                    <FileChipsWithPreview files={uploadedFiles} onRemoveFile={handleRemoveFile} />
                </div>
            )}
        </div>
    );
}

