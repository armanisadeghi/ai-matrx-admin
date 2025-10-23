// Task Item Component
import React from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Copy, Paperclip, Trash2, Calendar } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import TaskDetails from './TaskDetails';
import EditableTaskTitle from './EditableTaskTitle';

export default function TaskItem({ task }: { task: any }) {
  const { 
    showAllProjects,
    expandedTasks,
    toggleTaskComplete,
    toggleTaskExpand,
    updateTaskTitle,
    deleteTask,
    addAttachment,
    copyTaskToClipboard
  } = useTaskContext();

  const isPastDue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  const isExpanded = expandedTasks.includes(task.id);

  const handleSaveTitle = async (newTitle: string) => {
    await updateTaskTitle(task.projectId, task.id, newTitle);
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleTaskComplete(task.projectId, task.id)}
            className="mt-1 text-gray-400 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          >
            {task.completed ? (
              <CheckCircle className="text-green-500 dark:text-green-400" size={20} />
            ) : (
              <Circle size={20} />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            {showAllProjects && (
              <div className="text-xs mb-1 text-gray-500 dark:text-gray-400">
                {task.projectName}
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <EditableTaskTitle
                title={task.title}
                completed={task.completed}
                onSave={handleSaveTitle}
                onToggleComplete={() => toggleTaskComplete(task.projectId, task.id)}
              />
            </div>
            
            {/* Task metadata */}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {task.dueDate && (
                <div className={`flex items-center gap-1 ${
                  isPastDue ? 'text-red-500 dark:text-red-400 font-medium' : ''
                }`}>
                  <Calendar size={14} />
                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  {isPastDue && <span className="text-xs">(Overdue)</span>}
                </div>
              )}
              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip size={14} />
                  <span>{task.attachments.length}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => copyTaskToClipboard(task, e)}
              className="p-1.5 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Copy task"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={(e) => addAttachment(task.projectId, task.id, e)}
              className="p-1.5 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Add attachment"
            >
              <Paperclip size={16} />
            </button>
            <button
              onClick={(e) => deleteTask(task.projectId, task.id, e)}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => toggleTaskExpand(task.id)}
              className="p-1.5 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isExpanded ? "Hide details" : "Show details"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        
        {/* Expanded details */}
        {isExpanded && <TaskDetails task={task} />}
      </div>
    </div>
  );
}
