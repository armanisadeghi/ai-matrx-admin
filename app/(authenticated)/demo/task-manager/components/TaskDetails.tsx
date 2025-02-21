import React from 'react';
import { Paperclip, X } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

export default function TaskDetails({ task }) {
  const { 
    updateTaskDescription, 
    updateTaskDueDate, 
    removeAttachment 
  } = useTaskContext();

  return (
    <div className="mt-4 pl-9">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Due Date
        </label>
        <input
          type="date"
          value={task.dueDate}
          onChange={(e) => updateTaskDueDate(task.projectId, task.id, e.target.value)}
          className="border border-gray-300 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Details
        </label>
        <textarea
          value={task.description}
          onChange={(e) => updateTaskDescription(task.projectId, task.id, e.target.value)}
          placeholder="Add details about this task..."
          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          rows={3}
        />
      </div>
      
      {/* Attachments */}
      {task.attachments.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</h4>
          <ul className="space-y-2">
            {task.attachments.map((attachment, index) => (
              <li key={index} className="flex items-center rounded px-3 py-2 bg-gray-50 dark:bg-gray-700">
                <Paperclip size={14} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm flex-1 truncate ml-2 text-gray-600 dark:text-gray-300">{attachment}</span>
                <div 
                  className="text-gray-400 hover:text-red-500 cursor-pointer dark:text-gray-400 dark:hover:text-red-400"
                  onClick={() => removeAttachment(task.projectId, task.id, attachment)}
                >
                  <X size={14} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
