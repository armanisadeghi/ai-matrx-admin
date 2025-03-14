'use client';

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

type FilePreviewProps = {
  file?: {
    name: string;
    extension: string;
    contentType: string;
  };
};

export const FilePreview: React.FC<FilePreviewProps> = ({ file = {} }) => {
    const { activeNode } = useFileSystem();

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

    const fileDetails = getFileDetails(activeNode.extension);

    const renderPreview = () => {
        switch (fileDetails.category) {
            case 'IMAGE':
                return <ImagePreview file={activeNode} />;
            case 'AUDIO':
                return <AudioPreview file={activeNode} />;
            case 'VIDEO':
                return <VideoPreview file={activeNode} />;
            case 'DOCUMENT':
                switch (fileDetails.subCategory) {
                    case 'TEXT':
                        return <TextPreview file={activeNode} />;
                    case 'PDF':
                        return <PDFPreview file={activeNode} />;
                    default:
                        return <DefaultPreview file={activeNode} />;
                }
            case 'CODE':
                switch (fileDetails.subCategory) {
                    case 'JAVASCRIPT':
                    case 'TYPESCRIPT':
                    case 'PYTHON':
                    case 'WEB':
                    case 'CONFIG':
                    case 'MARKDOWN':
                        return <CodePreview file={activeNode} />;
                    default:
                        return <DefaultPreview file={activeNode} />;
                }
            case 'DATA':
                switch (fileDetails.subCategory) {
                    case 'STRUCTURED':
                    case 'CONFIG':
                        return <TextPreview file={activeNode} />;
                    default:
                        return <DefaultPreview file={activeNode} />;
                }
            case 'ARCHIVE':
                return <DefaultPreview file={activeNode} />;
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

export default FilePreview;