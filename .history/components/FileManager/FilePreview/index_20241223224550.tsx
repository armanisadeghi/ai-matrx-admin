// components/FileManager/FilePreview/index.tsx
import React from 'react';
import { NodeStructure } from '@/utils/file-operations';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { TextPreview } from './TextPreview';
import { ImagePreview } from './ImagePreview';
import { AudioPreview } from './AudioPreview';
import { VideoPreview } from './VideoPreview';
import { CodePreview } from './CodePreview';
import { PDFPreview } from './PDFPreview';
import { DefaultPreview } from './DefaultPreview';

interface FilePreviewProps {
    file: NodeStructure;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
    const { getFileDetails } = useFileSystem();
    const fileDetails = getFileDetails(file.path);

    const renderPreview = () => {
        switch (fileDetails.category) {
            case 'TEXT':
                return <TextPreview file={file} />;
            case 'IMAGE':
                return <ImagePreview file={file} />;
            case 'AUDIO':
                return <AudioPreview file={file} />;
            case 'VIDEO':
                return <VideoPreview file={file} />;
            case 'CODE':
                return <CodePreview file={file} />;
            case 'PDF':
                return <PDFPreview file={file} />;
            default:
                return <DefaultPreview file={file} />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <h3 className="text-lg font-medium">{file.name}</h3>
                <p className="text-sm text-muted-foreground">
                    {fileDetails.category} • {file.extension}
                </p>
            </div>
            <div className="flex-1 overflow-hidden">
                {renderPreview()}
            </div>
        </div>
    );
};
