import React from "react";
import { MultiFileUpload } from "./file-upload";
import { useFileUploadWithStorage } from "./useFileUploadWithStorage";

type FileUploadWithStorageProps = {
    bucket?: string;
    path?: string;
    onUploadComplete?: (results: { url: string; type: string }[]) => void;
    multiple?: boolean;
};

export const FileUploadWithStorage: React.FC<FileUploadWithStorageProps> = ({
    bucket = "userContent",
    path,
    onUploadComplete,
    multiple = false,
}) => {
    const { uploadFiles } = useFileUploadWithStorage(bucket, path);

    const handleFilesChange = async (files: File[]) => {
        const results = await uploadFiles(files);
        if (results.length > 0 && onUploadComplete) {
            onUploadComplete(results);
        }
    };

    return <MultiFileUpload onChange={handleFilesChange} multiple={multiple} />;
};

export default FileUploadWithStorage;
