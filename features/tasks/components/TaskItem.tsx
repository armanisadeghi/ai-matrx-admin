// Task Item Component
import React from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Copy, Paperclip, Trash2, Calendar, Plus } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import TaskDetails from './TaskDetails';
import EditableTaskTitle from './EditableTaskTitle';

export default function TaskItem({ task, depth = 0 }: { task: any; depth?: number }) {
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('textarea') ||
      target.closest('[contenteditable]')
    ) {
      return;
    }
    toggleTaskExpand(task.id);
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="px-3 py-2">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskComplete(task.projectId, task.id);
            }}
            className="mt-0.5 text-gray-400 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex-shrink-0"
          >
            {task.completed ? (
              <CheckCircle className="text-green-500 dark:text-green-400" size={18} />
            ) : (
              <Circle size={18} />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            {showAllProjects && (
              <div className="text-xs mb-0.5 text-gray-500 dark:text-gray-400">
                {task.projectName}
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-1">
              <EditableTaskTitle
                title={task.title}
                completed={task.completed}
                onSave={handleSaveTitle}
                onToggleComplete={() => toggleTaskComplete(task.projectId, task.id)}
              />
            </div>
            
            {/* Task metadata */}
            {(task.dueDate || (task.attachments && task.attachments.length > 0)) && (
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${
                    isPastDue ? 'text-red-500 dark:text-red-400 font-medium' : ''
                  }`}>
                    <Calendar size={12} />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    {isPastDue && <span>(Overdue)</span>}
                  </div>
                )}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip size={12} />
                    <span>{task.attachments.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyTaskToClipboard(task, e);
              }}
              className="p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Copy task"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                addAttachment(task.projectId, task.id, e);
              }}
              className="p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Add attachment"
            >
              <Paperclip size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(task.projectId, task.id, e);
              }}
              className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskExpand(task.id);
              }}
              className="p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isExpanded ? "Hide details" : "Show details"}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
        
        {/* Expanded details */}
        {isExpanded && <TaskDetails task={task} />}
        
        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2 ml-6 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
            {task.subtasks.map((subtask: any) => (
              <SubtaskItem key={subtask.id} subtask={subtask} parentTaskId={task.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Subtask component - simplified version for nested display
function SubtaskItem({ subtask, parentTaskId }: { subtask: any; parentTaskId: string }) {
  const { 
    toggleTaskComplete,
    updateTaskTitle,
    deleteTask,
  } = useTaskContext();

  const isPastDue = subtask.dueDate && new Date(subtask.dueDate) < new Date() && !subtask.completed;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('textarea') ||
      target.closest('[contenteditable]')
    ) {
      return;
    }
  };

  const handleSaveTitle = async (newTitle: string) => {
    await updateTaskTitle(parentTaskId, subtask.id, newTitle);
  };

  return (
    <div 
      className="bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
      onClick={handleCardClick}
    >
      <div className="px-2 py-1.5">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskComplete(parentTaskId, subtask.id);
            }}
            className="mt-0.5 text-gray-400 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex-shrink-0"
          >
            {subtask.completed ? (
              <CheckCircle className="text-green-500 dark:text-green-400" size={16} />
            ) : (
              <Circle size={16} />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <EditableTaskTitle
                title={subtask.title}
                completed={subtask.completed}
                onSave={handleSaveTitle}
                onToggleComplete={() => toggleTaskComplete(parentTaskId, subtask.id)}
              />
            </div>
            
            {/* Subtask metadata */}
            {subtask.dueDate && (
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <div className={`flex items-center gap-1 ${
                  isPastDue ? 'text-red-500 dark:text-red-400 font-medium' : ''
                }`}>
                  <Calendar size={10} />
                  <span>{new Date(subtask.dueDate).toLocaleDateString()}</span>
                  {isPastDue && <span>(Overdue)</span>}
                </div>
              </div>
            )}
          </div>
          
          {/* Subtask action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(parentTaskId, subtask.id, e);
              }}
              className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Delete subtask"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
