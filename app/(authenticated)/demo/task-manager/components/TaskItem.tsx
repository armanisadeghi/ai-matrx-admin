import React from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Copy, Paperclip, Trash2, Calendar, X } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import TaskDetails from './TaskDetails';

export default function TaskItem({ task }) {
  const { 
    showAllProjects,
    expandedTasks,
    toggleTaskComplete,
    toggleTaskExpand,
    deleteTask,
    addAttachment,
    copyTaskToClipboard
  } = useTaskContext();

  const isPastDue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div 
            className="mt-1 mr-3 cursor-pointer text-gray-400 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
            onClick={() => toggleTaskComplete(task.projectId, task.id)}
          >
            {task.completed ? (
              <CheckCircle className="text-green-500 dark:text-green-400" size={20} />
            ) : (
              <Circle size={20} />
            )}
          </div>
          <div className="flex-1" onClick={() => toggleTaskExpand(task.id)}>
            {showAllProjects && (
              <div className="text-xs mb-1 text-gray-500 dark:text-gray-400">
                {task.projectName}
              </div>
            )}
            <div className="flex items-center">
              <h3 className={`text-lg font-medium ${
                task.completed 
                  ? 'text-gray-500 line-through dark:text-gray-500' 
                  : isPastDue 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-900 dark:text-white'
              }`}>
                {task.title}
              </h3>
              {task.dueDate && (
                <div className={`ml-2 text-xs flex items-center ${
                  isPastDue 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <Calendar size={12} className="mr-1" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
            
            {/* Task actions */}
            <div className="flex items-center mt-2">
              <div 
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center cursor-pointer dark:text-gray-400 dark:hover:text-gray-300"
                onClick={() => toggleTaskExpand(task.id)}
              >
                {expandedTasks.includes(task.id) ? (
                  <>
                    <ChevronUp size={16} className="mr-1" />
                    <span>Hide details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} className="mr-1" />
                    <span>Show details</span>
                  </>
                )}
              </div>
              
              <div className="ml-auto flex items-center space-x-3">
                <div 
                  className="text-gray-500 hover:text-blue-600 cursor-pointer dark:text-gray-400 dark:hover:text-blue-400"
                  onClick={(e) => copyTaskToClipboard(task, e)}
                  title="Copy to clipboard"
                >
                  <Copy size={16} />
                </div>
                <div 
                  className="text-gray-500 hover:text-blue-600 cursor-pointer dark:text-gray-400 dark:hover:text-blue-400"
                  onClick={(e) => addAttachment(task.projectId, task.id, e)}
                  title="Add attachment"
                >
                  <Paperclip size={16} />
                </div>
                <div 
                  className="text-gray-500 hover:text-red-500 cursor-pointer dark:text-gray-400 dark:hover:text-red-400"
                  onClick={(e) => deleteTask(task.projectId, task.id, e)}
                  title="Delete task"
                >
                  <Trash2 size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Expanded details */}
        {expandedTasks.includes(task.id) && <TaskDetails task={task} />}
      </div>
    </div>
  );
}

