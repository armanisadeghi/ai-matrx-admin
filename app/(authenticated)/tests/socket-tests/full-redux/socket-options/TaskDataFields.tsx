'use client';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/redux/store';
import { updateTaskField, resetTaskData } from '@/lib/redux/socket-io/slices/socketTasksSlice';
import { selectTaskDataById, selectTaskById } from '@/lib/redux/socket-io/selectors/socket-task-selectors';
import { getTaskSchema } from '@/constants/socket-schema';

interface TaskDataFieldsProps {
  taskId: string | null;
  taskName: string;
  isConnected: boolean;
  onSubmit?: () => void;
}

const TaskDataFields: React.FC<TaskDataFieldsProps> = ({
  taskId,
  taskName,
  isConnected,
  onSubmit,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const taskData = useSelector((state: RootState) => (taskId ? selectTaskDataById(state, taskId) : {}));
  const task = useSelector((state: RootState) => (taskId ? selectTaskById(state, taskId) : null));
  const schema = taskName ? getTaskSchema(taskName) : null;

  useEffect(() => {
    if (!taskName || !taskId) {
      dispatch(resetTaskData(taskId));
    }
  }, [taskName, taskId, dispatch]);

  const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (taskId) {
      dispatch(updateTaskField({ taskId, field, value: e.target.value }));
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  if (!taskName || !taskId) {
    return null;
  }

  // Show fallback if schema is missing but task is selected
  if (!schema) {
    return (
      <div className="space-y-4 p-4 border-border rounded-md bg-white dark:bg-zinc-800">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          Task Data
        </h3>
        <p className="text-red-500 dark:text-red-400">
          No schema found for task: {taskName}
        </p>
        <button
          onClick={handleSubmit}
          disabled={!isConnected}
          className="mt-4 px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50"
        >
          Submit Task
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border-border rounded-md bg-white dark:bg-zinc-800">
      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
        Task Data
      </h3>
      <div className="space-y-3">
        {Object.keys(schema).length > 0 ? (
          Object.keys(schema).map((field) => (
            <div key={field} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field} ({schema[field].DATA_TYPE})
                {schema[field].REQUIRED && (
                  <span className="ml-1 text-red-500 dark:text-red-400">*</span>
                )}
              </label>
              <input
                type="text"
                value={taskData[field] || ''}
                onChange={handleFieldChange(field)}
                placeholder={schema[field].DESCRIPTION}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
              />
            </div>
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            This task doesn't require any additional data.
          </p>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!isConnected}
        className="mt-4 px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50"
      >
        Submit Task
      </button>
    </div>
  );
};

export default TaskDataFields;