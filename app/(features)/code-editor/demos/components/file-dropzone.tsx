// components/file-dropzone.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileDropzoneProps {
    onFileDrop: (file: File) => void;
}

export function FileDropzone({ onFileDrop }: FileDropzoneProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onFileDrop(acceptedFiles[0]);
        }
    }, [onFileDrop]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false
    });

    return (
        <div
            {...getRootProps()}
            className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'}
            `}
        >
            <input {...getInputProps()} />
            {isDragActive ? (
                <p>Drop the file here...</p>
            ) : (
                <p>Drag & drop a file here, or click to select</p>
            )}
        </div>
    );
}