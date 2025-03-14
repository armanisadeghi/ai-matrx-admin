// GenericPreview.tsx
import React from "react";
import { FileIcon } from "lucide-react";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import { formatBytes } from "../utils/formatting";

interface GenericPreviewProps {
  file: {
    url: string;
    type: string;
    details?: EnhancedFileDetails;
  };
}

const GenericPreview: React.FC<GenericPreviewProps> = ({ file }) => {
  const fileName = file.details?.filename || 'Unknown File';
  const fileExtension = file.details?.extension || '';
  const fileSize = file.details?.size ? formatBytes(file.details.size) : '';
  const Icon = file.details?.icon || FileIcon;
  const iconColor = file.details?.color || "text-gray-500 dark:text-gray-400";
  
  return (
    <div className="flex items-center justify-center h-full w-full bg-white dark:bg-gray-800">
      <div className="text-center p-8">
        {/* File icon with background */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {Icon && <Icon className={`w-12 h-12 ${iconColor}`} />}
          </div>
        </div>
        
        {/* File information */}
        <h3 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-100 break-all">{fileName}</h3>
        
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {file.details?.subCategory || file.details?.category || 'Unknown file type'}
          {fileExtension && ` (.${fileExtension})`}
        </div>
        
        {fileSize && (
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {fileSize}
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          This file type cannot be previewed directly.
        </div>
      </div>
    </div>
  );
};

export default GenericPreview;