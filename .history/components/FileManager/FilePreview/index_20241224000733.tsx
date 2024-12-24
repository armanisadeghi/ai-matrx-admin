// components/FileManager/FilePreview/index.tsx
import React from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { TextPreview } from './TextPreview';
import { ImagePreview } from './ImagePreview';
import { AudioPreview } from './AudioPreview';
import { VideoPreview } from './VideoPreview';
import { CodePreview } from './CodePreview';
import { PDFPreview } from './PDFPreview';
import { DefaultPreview } from './DefaultPreview';
import { Loader2, FolderIcon } from 'lucide-react';
import { getFileDetails } from "@/utils/file-operations";

export const FilePreview: React.FC = () => {
    const { activeNode, getFileDetails } = useFileSystem();

    if (!activeNode) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>No file selected</p>
            </div>
        );
    }

    if (activeNode.contentType === 'FOLDER') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <FolderIcon className="h-16 w-16 mb-4" />
                <p className="text-lg">{activeNode.name}</p>
                <p className="text-sm">Folder</p>
            </div>
        );
    }

    const fileWithDetails = getFileDetails(activeNode.extension);

    const renderPreview = () => {
        switch (fileWithDetails.category) {
            case 'TEXT':
                return <TextPreview file={fileWithDetails} />;
            case 'IMAGE':
                return <ImagePreview file={fileWithDetails} />;
            case 'AUDIO':
                return <AudioPreview file={fileWithDetails} />;
            case 'VIDEO':
                return <VideoPreview file={fileWithDetails} />;
            case 'CODE':
                return <CodePreview file={fileWithDetails} />;
            case 'PDF':
                return <PDFPreview file={fileWithDetails} />;
            default:
                return <DefaultPreview file={fileWithDetails} />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <h3 className="text-lg font-medium">{fileWithDetails.name}</h3>
                <p className="text-sm text-muted-foreground">
                    {fileWithDetails.category} • {fileWithDetails.extension}
                </p>
            </div>
            <div className="flex-1 overflow-hidden">
                {renderPreview()}
            </div>
        </div>
    );
};
