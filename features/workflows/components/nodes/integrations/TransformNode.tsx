// src/components/nodes/TransformNode.tsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ArrowRightLeft, Code } from 'lucide-react';

function TransformNode({ data, isConnectable }) {
  return (
    <div className="border border-gray-300 rounded-lg bg-white dark:bg-gray-800 shadow-md w-60">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg mr-3">
            <ArrowRightLeft className="h-6 w-6 text-green-700 dark:text-green-300" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.label || 'Transform Data'}</div>
            {data.transformationType && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.transformationType}</div>
            )}
          </div>
        </div>
        
        {data.schema && (
          <div className="mt-3 flex items-center space-x-2">
            <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {data.schema.input && `Input: ${data.schema.input}`}
            </div>
            <ArrowRightLeft className="h-3 w-3 text-gray-400" />
            <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {data.schema.output && `Output: ${data.schema.output}`}
            </div>
          </div>
        )}
        
        {data.code && (
          <div className="mt-2 relative">
            <div className="absolute top-1 right-1">
              <Code className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300 overflow-hidden text-ellipsis">
              {data.code.length > 60 ? `${data.code.substring(0, 60)}...` : data.code}
            </div>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
}

export default memo(TransformNode);