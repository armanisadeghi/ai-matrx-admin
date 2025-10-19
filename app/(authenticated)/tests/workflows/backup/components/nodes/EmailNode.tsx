import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

function EmailNode({ data, isConnectable }) {
  const deliveryStatus = data.deliveryStatus || 'pending'; // 'pending', 'delivered', 'failed'
  
  return (
    <div className="border border-gray-300 rounded-lg bg-textured shadow-md w-52">
      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2">
        <div className="flex items-center justify-center w-6 h-6 bg-blue-300 dark:bg-gray-700 rounded-md">
          <Mail className="h-4 w-4 text-blue-600 dark:text-gray-300" />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
            <Mail className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{data.label}</div>
            {data.subLabel && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.subLabel}</div>
            )}
          </div>
        </div>
        
        {/* Template Preview */}
        {data.template && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs overflow-hidden">
            <div className="text-gray-500 dark:text-gray-400 mb-1">Template:</div>
            <div className="truncate text-gray-700 dark:text-gray-300">{data.template}</div>
          </div>
        )}
        
        {/* Delivery Status */}
        <div className="mt-2 flex items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">Status:</div>
          {deliveryStatus === 'delivered' && (
            <div className="flex items-center text-green-500 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Delivered
            </div>
          )}
          {deliveryStatus === 'failed' && (
            <div className="flex items-center text-red-500 text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              Failed
            </div>
          )}
          {deliveryStatus === 'pending' && (
            <div className="flex items-center text-yellow-500 text-xs">
              <div className="h-2 w-2 rounded-full bg-yellow-500 mr-1"></div>
              Pending
            </div>
          )}
        </div>
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

export default memo(EmailNode);