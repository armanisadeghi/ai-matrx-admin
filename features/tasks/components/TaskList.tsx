import React from 'react';
import TaskItem from './TaskItem';

export default function TaskList({ tasks }) {
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
            {tasks.length === 0 ? 'Add your first task to get started' : 'No tasks match the current filter'}
          </p>
        </div>
      )}
    </>
  );
}
