// src/components/nodes/DatabaseNode.tsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Database } from 'lucide-react';

function DatabaseNode({ data, isConnectable }) {
  return (
    <div className="border border-gray-300 rounded-lg bg-textured shadow-md w-56">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-cyan-100 dark:bg-cyan-900 p-2 rounded-lg mr-3">
            <Database className="h-6 w-6 text-cyan-700 dark:text-cyan-300" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.label || 'PostgreSQL'}</div>
            {data.action && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.action}</div>
            )}
          </div>
        </div>
        
        {data.connectionStatus && (
          <div className="mt-3 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              data.connectionStatus === 'connected' 
                ? 'bg-green-500' 
                : data.connectionStatus === 'pending' 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {data.connectionStatus === 'connected' 
                ? 'Connected' 
                : data.connectionStatus === 'pending' 
                  ? 'Connecting...' 
                  : 'Disconnected'}
            </span>
          </div>
        )}
        
        {data.query && (
          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300 overflow-hidden text-ellipsis">
            {data.query.length > 60 ? `${data.query.substring(0, 60)}...` : data.query}
          </div>
        )}
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

export default memo(DatabaseNode);