// Task Details Component with Debounced Auto-Save
'use client';

import React, { useState, useEffect } from 'react';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import { useDebounce } from '../hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function TaskDetails({ task }: { task: any }) {
  const { 
    updateTaskDescription, 
    updateTaskDueDate, 
    removeAttachment 
  } = useTaskContext();

  // Local state for editing
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [isSaving, setIsSaving] = useState(false);

  // Debounce values - wait 1.5 seconds after user stops typing
  const debouncedDescription = useDebounce(description, 1500);
  const debouncedDueDate = useDebounce(dueDate, 1000);

  // Update local state when task prop changes
  useEffect(() => {
    setDescription(task.description || '');
    setDueDate(task.dueDate || '');
  }, [task.id]); // Only reset when task changes

  // Auto-save description when debounced value changes
  useEffect(() => {
    if (debouncedDescription !== task.description) {
      setIsSaving(true);
      updateTaskDescription(task.projectId, task.id, debouncedDescription)
        .finally(() => setIsSaving(false));
    }
  }, [debouncedDescription]);

  // Auto-save due date when debounced value changes
  useEffect(() => {
    if (debouncedDueDate !== task.dueDate) {
      setIsSaving(true);
      updateTaskDueDate(task.projectId, task.id, debouncedDueDate)
        .finally(() => setIsSaving(false));
    }
  }, [debouncedDueDate]);

  return (
    <div className="mt-3 pl-6 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Due Date
          </label>
          {isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Saving...
            </span>
          )}
        </div>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-sm"
        />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Details
          </label>
          {isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Saving...
            </span>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about this task..."
            className="text-sm resize-none"
            rows={8}
          />
        </div>
      </div>
      
      {/* Attachments */}
      {task.attachments && task.attachments.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Attachments</h4>
          <ul className="space-y-1.5">
            {task.attachments.map((attachment: string, index: number) => (
              <li key={index} className="flex items-center rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-700">
                <Paperclip size={12} className="text-gray-500 dark:text-gray-400" />
                <span className="text-xs flex-1 truncate ml-2 text-gray-600 dark:text-gray-300">{attachment}</span>
                <button
                  onClick={() => removeAttachment(task.projectId, task.id, attachment)}
                  className="text-gray-400 hover:text-red-500 cursor-pointer dark:text-gray-400 dark:hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
