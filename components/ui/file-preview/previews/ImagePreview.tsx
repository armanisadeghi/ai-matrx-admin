// ImagePreview.tsx
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import React from "react";

interface ImagePreviewProps {
  file: {
    url: string;
    type: string;
    details?: EnhancedFileDetails;
  };
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ file }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      <img 
        src={file.url} 
        alt={file.details?.filename || "Image"} 
        className="max-w-full max-h-full object-contain rounded-md"
      />
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {file.details?.filename || "Image"}
      </div>
    </div>
  );
};

export default ImagePreview;
