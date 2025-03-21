// src/components/nodes/ConditionalNode.tsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

function ConditionalNode({ data, isConnectable }) {
  return (
    <div className="border border-gray-300 rounded-lg bg-white dark:bg-gray-800 shadow-md w-60">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg mr-3">
            <GitBranch className="h-6 w-6 text-purple-700 dark:text-purple-300" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.label || 'Condition'}</div>
            {data.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.description}</div>
            )}
          </div>
        </div>
        
        <div className="mt-3 space-y-2">
          {data.condition && (
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              {data.condition.length > 60 ? `${data.condition.substring(0, 60)}...` : data.condition}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">True</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">False</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* True path */}
      <Handle
        type="source"
        id="true"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500"
        style={{ top: '40%' }}
      />
      
      {/* False path */}
      <Handle
        type="source"
        id="false"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-red-500"
        style={{ top: '60%' }}
      />
    </div>
  );
}

export default memo(ConditionalNode);