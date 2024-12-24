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

    const fileDetails = getFileDetails(activeNode.path);

    const renderPreview = () => {
        switch (fileDetails.category) {
            case 'TEXT':
                return <TextPreview file={activeNode} />;
            case 'IMAGE':
                return <ImagePreview file={activeNode} />;
            case 'AUDIO':
                return <AudioPreview file={activeNode} />;
            case 'VIDEO':
                return <VideoPreview file={activeNode} />;
            case 'CODE':
                return <CodePreview file={activeNode} />;
            case 'PDF':
                return <PDFPreview file={activeNode} />;
            default:
                return <DefaultPreview file={activeNode} />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <h3 className="text-lg font-medium">{activeNode.name}</h3>
                <p className="text-sm text-muted-foreground">
                    {fileDetails.category} • {activeNode.extension}
                </p>
            </div>
            <div className="flex-1 overflow-hidden">
                {renderPreview()}
            </div>
        </div>
    );
};
