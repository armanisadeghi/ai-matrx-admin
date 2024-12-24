// components/FileManager/FilePreview/VideoPreview.tsx
import React from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import ReactPlayer from 'react-player';

interface VideoPreviewProps {
    file: NodeStructure;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ file }) => {
    const { getPublicUrl } = useFileSystem();

    return (
        <div className="h-full flex items-center justify-center bg-black">
            <ReactPlayer
                url={getPublicUrl(file.path)}
                controls
                width="100%"
                height="100%"
                config={{
                    file: {
                        attributes: {
                            controlsList: 'nodownload',
                            disablePictureInPicture: true,
                        },
                    },
                }}
                style={{ maxHeight: '100%', maxWidth: '100%' }}
            />
        </div>
    );
};
