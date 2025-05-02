// src/components/nodes/LoopNode.tsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Repeat, RefreshCw } from 'lucide-react';

function LoopNode({ data, isConnectable }) {
  return (
    <div className="border border-gray-300 rounded-lg bg-white dark:bg-gray-800 shadow-md w-56">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-lg mr-3">
            <Repeat className="h-6 w-6 text-amber-700 dark:text-amber-300" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.label || 'Loop'}</div>
            {data.loopType && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.loopType}</div>
            )}
          </div>
        </div>
        
        <div className="mt-3 space-y-2">
          {data.collection && (
            <div className="flex items-center">
              <span className="text-xs text-gray-600 dark:text-gray-300 mr-2">Collection:</span>
              <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                {data.collection}
              </div>
            </div>
          )}
          
          {(data.count !== undefined || data.currentIteration !== undefined) && (
            <div className="flex items-center justify-between">
              {data.currentIteration !== undefined && (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  Current: {data.currentIteration}
                </span>
              )}
              {data.count !== undefined && (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  Total: {data.count}
                </span>
              )}
            </div>
          )}
          
          {data.running && (
            <div className="flex items-center mt-1">
              <RefreshCw className="h-3 w-3 text-blue-500 animate-spin mr-1" />
              <span className="text-xs text-blue-500">Running...</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Current iteration output */}
      <Handle
        type="source"
        id="iteration"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-500"
        style={{ top: '40%' }}
      />
      
      {/* Loop completed output */}
      <Handle
        type="source"
        id="complete"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
}

export default memo(LoopNode);