import React from 'react';
import { useSelector } from 'react-redux';
import { selectTaskDataById } from '@/lib/redux/socket-io/selectors';
import { RootState } from '@/lib/redux/store';

interface TaskDataDebugProps {
  taskId: string;
  show?: boolean;
}

const TaskDataDebug: React.FC<TaskDataDebugProps> = ({ taskId, show = true }) => {
  const taskData = useSelector((state: RootState) => selectTaskDataById(state, taskId));

  if (!show) return null;

  return (
    <div className="mt-6 border-t border-gray-300 dark:border-gray-700 pt-4">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Task Data (Debug View)
      </div>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
        {JSON.stringify(taskData, null, 2)}
      </pre>
    </div>
  );
};

export default TaskDataDebug; 