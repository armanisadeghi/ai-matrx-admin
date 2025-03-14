// GenericPreview.tsx
import React from "react";
import { Download } from "lucide-react";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";

interface GenericPreviewProps {
  file: {
    url: string;
    type: string;
    details?: EnhancedFileDetails;
  };
}

const GenericPreview: React.FC<GenericPreviewProps> = ({ file }) => {
  const fileName = file.details?.filename || 'Unknown File';
  const Icon = file.details?.icon;
  
  const handleDownload = () => {
    window.open(file.url, '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 h-full">
      <div className="flex flex-col items-center text-center">
        {Icon && <Icon className="mb-4" />}
        
        <div className="text-lg font-medium mt-4 mb-2">{fileName}</div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {file.details?.subCategory || ''}
        </div>
        
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Download size={16} />
          <span>Download File</span>
        </button>
        
        <div className="mt-4 text-sm text-gray-500">
          This file type cannot be previewed directly.
        </div>
      </div>
    </div>
  );
};

export default GenericPreview;
