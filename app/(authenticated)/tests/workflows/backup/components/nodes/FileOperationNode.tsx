import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileText, Upload, Download, FileSymlink } from 'lucide-react';

function FileOperationNode({ data, isConnectable }) {
  const operation = data.operation || 'read'; // 'read', 'write', 'upload', 'download'
  const progress = data.progress !== undefined ? data.progress : null; // 0-100 for progress bar
  
  // Select icon based on operation type
  const getOperationIcon = () => {
    switch (operation) {
      case 'write': return <FileSymlink className="h-6 w-6 text-gray-700 dark:text-gray-300" />;
      case 'upload': return <Upload className="h-6 w-6 text-gray-700 dark:text-gray-300" />;
      case 'download': return <Download className="h-6 w-6 text-gray-700 dark:text-gray-300" />;
      default: return <FileText className="h-6 w-6 text-gray-700 dark:text-gray-300" />;
    }
  };
  
  // Get file type indicator color
  const getFileTypeColor = () => {
    const fileType = data.fileType || 'unknown';
    switch (fileType) {
      case 'image': return 'bg-purple-500';
      case 'document': return 'bg-blue-500';
      case 'spreadsheet': return 'bg-green-500';
      case 'archive': return 'bg-yellow-500';
      case 'code': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="border border-gray-300 rounded-lg bg-textured shadow-md w-52">
      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2">
        <div className="flex items-center justify-center w-6 h-6 bg-green-300 dark:bg-gray-700 rounded-md">
          <FileText className="h-4 w-4 text-green-600 dark:text-gray-300" />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
            {getOperationIcon()}
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{data.label}</div>
            {data.subLabel && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.subLabel}</div>
            )}
          </div>
        </div>
        
        {/* File Type Indicator */}
        {data.fileType && (
          <div className="mt-2 flex items-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">File Type:</div>
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full ${getFileTypeColor()} mr-1`}></div>
              <span className="text-xs capitalize">{data.fileType}</span>
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        {progress !== null && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">Progress:</div>
              <div className="text-xs text-gray-700 dark:text-gray-300">{progress}%</div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
}

export default memo(FileOperationNode);