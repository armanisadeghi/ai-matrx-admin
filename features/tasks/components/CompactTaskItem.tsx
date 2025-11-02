'use client';

import React from 'react';
import { Circle, CheckCircle, Calendar, Flag, Paperclip, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface CompactTaskItemProps {
  task: any;
  isSelected: boolean;
  onSelect: () => void;
  onToggleComplete: () => void;
  hideProjectName?: boolean; // Hide project name when already shown in context (e.g., AllTasksView)
}

export default function CompactTaskItem({
  task,
  isSelected,
  onSelect,
  onToggleComplete,
  hideProjectName = false,
}: CompactTaskItemProps) {
  // Check if task is past due - compare dates consistently
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const isPastDue = task.dueDate && task.dueDate < todayStr && !task.completed;

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800';
      default:
        return '';
    }
  };

  return (
    <div
      className={`group px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 shadow-sm'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.completed}
            onCheckedChange={onToggleComplete}
            className="mt-0.5"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={`text-sm font-medium mb-1 ${
              task.completed
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {task.title}
          </h3>

          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Due Date */}
            {task.dueDate && (
              <div
                className={`flex items-center gap-1 ${
                  isPastDue
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Calendar size={12} />
                <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}

            {/* Project */}
            {task.projectName && !hideProjectName && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <span className="text-blue-600 dark:text-blue-400">● {task.projectName}</span>
              </div>
            )}

            {/* Priority */}
            {task.priority && (
              <div className={`px-1.5 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </div>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Paperclip size={12} />
                <span>{task.attachments.length}</span>
              </div>
            )}

            {/* Assignee */}
            {task.assigneeName && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <User size={12} />
                <span>{task.assigneeName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

