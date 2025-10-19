// src/components/nodes/ToolNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Calendar, AlertTriangle } from 'lucide-react';

function ToolNode({ data, isConnectable }) {
  return (
    <div className="relative border border-gray-300 rounded-lg bg-textured shadow-md w-56">
      {data.hasError && (
        <div className="absolute -right-2 -top-2 w-8 h-8 flex items-center justify-center bg-textured rounded-full border-2 border-red-500">
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </div>
      )}
      
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-blue-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
            <Calendar className="h-6 w-6 text-blue-700 dark:text-gray-300" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.label}</div>
            {data.action && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.action}</div>
            )}
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
}

export default memo(ToolNode);