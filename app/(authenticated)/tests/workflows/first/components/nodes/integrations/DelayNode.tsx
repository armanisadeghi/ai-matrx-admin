// src/components/nodes/DelayNode.tsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';

function DelayNode({ data, isConnectable }) {
  // Calculate progress for the timer visualization
  const progress = data.progress !== undefined ? data.progress : 0;
  const progressStyle = {
    width: `${progress}%`,
    transition: 'width 1s linear'
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-white dark:bg-gray-800 shadow-md w-52">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
            <Clock className="h-6 w-6 text-blue-700 dark:text-blue-300" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.label || 'Delay'}</div>
            {data.duration && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.duration}</div>
            )}
          </div>
        </div>
        
        {data.showTimer && (
          <div className="mt-3">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={progressStyle}>
              </div>
            </div>
            {data.timeRemaining && (
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 text-center">
                {data.timeRemaining}
              </div>
            )}
          </div>
        )}
        
        {data.scheduledTime && (
          <div className="mt-2 flex items-center">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              Scheduled: {data.scheduledTime}
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

export default memo(DelayNode);