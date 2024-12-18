// components/storage-testing/components/FileUploader.tsx
import { useState, useRef } from 'react';
import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface FileUploaderProps {
    explorer: UseStorageExplorerReturn;
}

export function FileUploader({ explorer }: FileUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFile, currentPath } = explorer;

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await uploadFile(file);
                setUploadProgress(((i + 1) / files.length) * 100);
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Current Upload Location</Label>
                <div className="font-mono text-sm text-muted-foreground">
                    /{currentPath.join('/')}
                </div>
            </div>

            <div className="space-y-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                />
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    {isUploading ? 'Uploading...' : 'Select Files'}
                </Button>
            </div>

            {isUploading && (
                <Progress value={uploadProgress} />
            )}
        </div>
    );
}