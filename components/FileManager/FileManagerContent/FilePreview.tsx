// components/FileManager/FileManagerContent/FilePreview.tsx
import React, { useState } from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import {BucketStructure} from "@/utils/file-operations";

import { cn } from '@/lib/utils';

interface FilePreviewProps {
    file: BucketStructure;
    isDialog?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, isDialog }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { currentBucket, getPublicUrl, getFileDetails, downloadFile } = useFileSystem();

    const fileDetails = getFileDetails(file.path);
    const publicUrl = getPublicUrl(currentBucket!, file.path);
    const fileExtension = file.path.split('.').pop()?.toLowerCase();

    const handleDownload = async () => {
        setIsLoading(true);
        try {
            await downloadFile(currentBucket!, file.path);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const PreviewActions = () => (
        <div className="flex items-center space-x-2 mb-4">
            <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isLoading}
            >
                <Download className="h-4 w-4 mr-2" />
                Download
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(publicUrl, '_blank')}
            >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in new tab
            </Button>
            {fileDetails.canPreview && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                >
                    {isFullscreen ? (
                        <Minimize2 className="h-4 w-4 mr-2" />
                    ) : (
                        <Maximize2 className="h-4 w-4 mr-2" />
                    )}
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </Button>
            )}
        </div>
    );

    const renderPreview = () => {
        const previewClasses = cn(
            'rounded-lg',
            isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'w-full'
        );

        switch (fileExtension) {
            case 'pdf':
                return (
                    <iframe
                        src={publicUrl}
                        className={cn(previewClasses, 'h-[400px]')}
                        title="PDF Preview"
                    />
                );
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
                return (
                    <img
                        src={publicUrl}
                        alt={file.path.split('/').pop() || 'Preview'}
                        className={cn(previewClasses, 'max-w-full h-auto object-contain')}
                    />
                );
            case 'mp4':
            case 'webm':
                return (
                    <video
                        controls
                        className={previewClasses}
                    >
                        <source src={publicUrl} type={`video/${fileExtension}`} />
                        Your browser does not support the video tag.
                    </video>
                );
            case 'mp3':
            case 'wav':
                return (
                    <audio
                        controls
                        className="w-full"
                    >
                        <source src={publicUrl} type={`audio/${fileExtension}`} />
                        Your browser does not support the audio tag.
                    </audio>
                );
            // Add more file types as needed
            case 'txt':
            case 'json':
            case 'md':
                return (
                    <iframe
                        src={publicUrl}
                        className={cn(previewClasses, 'h-[400px] bg-white dark:bg-gray-800')}
                        title="Text Preview"
                    />
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center p-8">
                        <fileDetails.icon className={cn('h-16 w-16', fileDetails.color)} />
                        <p className="mt-4 text-sm text-muted-foreground">
                            Preview not available for this file type
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            className="mt-4"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download to view
                        </Button>
                    </div>
                );
        }
    };

    return (
        <Card className={cn(
            "p-4",
            isFullscreen && "fixed inset-0 z-50 rounded-none"
        )}>
            <div className={cn(
                "flex flex-col",
                isFullscreen && "h-full"
            )}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">
                        {file.path.split('/').pop()}
                    </h3>
                    <PreviewActions />
                </div>
                <div className={cn(
                    "relative",
                    isFullscreen && "flex-1"
                )}>
                    {renderPreview()}
                </div>
            </div>
        </Card>
    );
};