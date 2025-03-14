// previews/VideoPreview.tsx
import React from 'react';

interface VideoPreviewProps {
  file: {
    url: string;
    blob?: Blob | null;
    type: string;
    details?: any;
  };
  isLoading: boolean;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ file, isLoading }) => {
  if (isLoading) return <div className="flex items-center justify-center h-full">Loading video...</div>;
  
  return (
    <div className="flex items-center justify-center h-full w-full">
      <video 
        controls 
        className="max-h-full max-w-full" 
        src={file.url}
        controlsList="nodownload"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPreview;

