// src/components/nodes/ApiNode.tsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Globe, ArrowRight } from 'lucide-react';

function ApiNode({ data, isConnectable }) {
  // Get appropriate method color
  const getMethodColor = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case 'POST':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'PUT':
        return 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
      case 'PATCH':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-textured shadow-md w-64">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg mr-3">
            <Globe className="h-6 w-6 text-indigo-700 dark:text-indigo-300" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.label || 'API Request'}</div>
            {data.endpoint && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {data.endpoint.length > 25 ? `${data.endpoint.substring(0, 25)}...` : data.endpoint}
              </div>
            )}
          </div>
        </div>
        
        {data.method && (
          <div className="mt-3 flex items-center">
            <span className={`text-xs font-medium px-2 py-1 rounded ${getMethodColor(data.method)}`}>
              {data.method.toUpperCase()}
            </span>
            {data.status && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                Status: {data.status}
              </span>
            )}
          </div>
        )}
        
        {data.auth && (
          <div className="mt-2 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              data.auth.enabled ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {data.auth.type || 'Auth'}: {data.auth.enabled ? 'Enabled' : 'Disabled'}
            </span>
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

export default memo(ApiNode);