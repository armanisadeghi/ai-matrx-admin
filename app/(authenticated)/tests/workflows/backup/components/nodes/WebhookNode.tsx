import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Globe, Clock, Power, PowerOff } from 'lucide-react';

function WebhookNode({ data, isConnectable }) {
  const active = data.active !== undefined ? data.active : false;
  const lastTriggered = data.lastTriggered || null;
  
  // Format the timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp; // If invalid date, return the raw string
    }
  };
  
  return (
    <div className="border border-gray-300 rounded-lg bg-white dark:bg-gray-800 shadow-md w-52">
      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2">
        <div className="flex items-center justify-center w-6 h-6 bg-yellow-300 dark:bg-gray-700 rounded-md">
          <Globe className="h-4 w-4 text-yellow-600 dark:text-gray-300" />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
            <Globe className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{data.label}</div>
            {data.subLabel && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.subLabel}</div>
            )}
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="mt-2 flex items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">Status:</div>
          {active ? (
            <div className="flex items-center text-green-500 text-xs">
              <Power className="h-3 w-3 mr-1" />
              Active
            </div>
          ) : (
            <div className="flex items-center text-gray-500 text-xs">
              <PowerOff className="h-3 w-3 mr-1" />
              Inactive
            </div>
          )}
        </div>
        
        {/* Endpoint URL */}
        {data.endpoint && (
          <div className="mt-2 bg-gray-50 dark:bg-gray-700 rounded p-1.5 overflow-hidden">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Endpoint:</div>
            <div className="truncate text-xs font-mono text-gray-700 dark:text-gray-300">
              {data.endpoint}
            </div>
          </div>
        )}
        
        {/* Last Triggered */}
        <div className="mt-2 flex items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
            <Clock className="h-3 w-3 inline mr-1" />
            Last triggered:
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300">
            {formatTimestamp(lastTriggered)}
          </div>
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

export default memo(WebhookNode);