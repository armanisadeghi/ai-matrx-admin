import React from 'react';
import TaskItem from './TaskItem';
import { useTaskContext } from '@/features/tasks/context/TaskContext';

export default function TaskList({ tasks }) {
  const { loading } = useTaskContext();

  // Don't show empty state while loading - show skeleton tasks
  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <h3 className="text-lg font-medium">No tasks found</h3>
          <p className="mt-1 text-gray-400 dark:text-gray-500">
            Add your first task to get started
          </p>
        </div>
      )}
    </>
  );
}
