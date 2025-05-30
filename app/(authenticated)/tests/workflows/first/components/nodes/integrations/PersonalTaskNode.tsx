import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckSquare, Clock, AlertCircle } from 'lucide-react';

function PersonalTaskNode({ data, isConnectable }) {
  const taskStatus = data.taskStatus || 'pending'; // 'pending', 'completed', 'overdue'
  
  return (
    <div className="border border-gray-300 rounded-lg bg-white dark:bg-gray-800 shadow-md w-52">
      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2">
        <div className="flex items-center justify-center w-6 h-6 bg-green-300 dark:bg-gray-700 rounded-md">
          <CheckSquare className="h-4 w-4 text-green-600 dark:text-gray-300" />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
            <CheckSquare className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{data.label}</div>
            {data.subLabel && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.subLabel}</div>
            )}
          </div>
        </div>
        
        {/* Task Details */}
        {data.description && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs overflow-hidden">
            <div className="text-gray-500 dark:text-gray-400 mb-1">Description:</div>
            <div className="truncate text-gray-700 dark:text-gray-300">{data.description}</div>
          </div>
        )}
        
        {/* Due Date */}
        {data.dueDate && (
          <div className="mt-2 flex items-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">Due:</div>
            <div className="flex items-center text-gray-700 dark:text-gray-300 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {data.dueDate}
            </div>
          </div>
        )}
        
        {/* Task Status */}
        <div className="mt-2 flex items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">Status:</div>
          {taskStatus === 'completed' && (
            <div className="flex items-center text-green-500 text-xs">
              <CheckSquare className="h-3 w-3 mr-1" />
              Completed
            </div>
          )}
          {taskStatus === 'overdue' && (
            <div className="flex items-center text-red-500 text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Overdue
            </div>
          )}
          {taskStatus === 'pending' && (
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

export default memo(PersonalTaskNode);