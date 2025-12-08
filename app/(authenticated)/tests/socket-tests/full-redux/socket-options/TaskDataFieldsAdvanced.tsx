'use client'
import React from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import DynamicForm from '@/components/socket/form-builder/DynamicForm';

interface TaskDataFieldsAdvancedProps {
  taskId: string | null;
  taskName: string;
  isConnected: boolean;
  onSubmit?: () => void;
}

const TaskDataFieldsAdvanced: React.FC<TaskDataFieldsAdvancedProps> = ({ 
  taskId,
  taskName, 
  isConnected,
  onSubmit
}) => {
  const dispatch = useDispatch<AppDispatch>();

  // Let DynamicForm manage its own state completely
  // Only take the form data when the form is submitted
  const handleSubmit = (formData: Record<string, any>) => {
    // When the form is submitted, we'll get all the form data
    // We don't need to do anything with it, just pass control back to the parent
    if (onSubmit) {
      onSubmit();
    }
  };

  // Exit early if no task selected
  if (!taskId) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 border-border rounded-md bg-white dark:bg-zinc-800">
      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
        Task Data (Advanced)
      </h3>
      <DynamicForm
        taskType={taskName}
        onChange={() => {}} // No-op since we don't need to track changes
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default TaskDataFieldsAdvanced; 