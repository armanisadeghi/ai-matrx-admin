// components/FileManager/FilePreview/ImagePreview.tsx
import React, { useState } from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import { Loader2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewProps {
    file: NodeStructure;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ file }) => {
    const { getPublicUrlSync, currentBucket } = useFileSystem();
    const [isLoading, setIsLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);

    const imageUrl = currentBucket ? getPublicUrlSync(currentBucket, file.path) : '';

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-center space-x-2 p-2 border-b">
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleRotate}>
                    <RotateCw className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                {isLoading && (
                    <Loader2 className="h-8 w-8 animate-spin" />
                )}
                <img
                    src={imageUrl}
                    alt={file.name}
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-in-out',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain'
                    }}
                    onLoad={() => setIsLoading(false)}
                    className={isLoading ? 'hidden' : ''}
                />
            </div>
        </div>
    );
};
