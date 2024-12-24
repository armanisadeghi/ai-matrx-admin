// components/FileManager/FilePreview/DefaultPreview.tsx
import React from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import { FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DefaultPreviewProps {
    file: NodeStructure;
}

export const DefaultPreview: React.FC<DefaultPreviewProps> = ({ file }) => {
    const { downloadFile, currentBucket, getFileIcon, getFileColor } = useFileSystem();
    const Icon = getFileDetails

    const handleDownload = async () => {
        const blob = await downloadFile(currentBucket!, file.path);
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center space-y-4">
            <Icon className={`h-24 w-24 ${getFileColor(file.path)}`} />
            <div className="text-center">
                <h3 className="text-lg font-medium">{file.name}</h3>
                <p className="text-sm text-muted-foreground">
                    This file type cannot be previewed
                </p>
            </div>
            <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
            </Button>
        </div>
    );
};
