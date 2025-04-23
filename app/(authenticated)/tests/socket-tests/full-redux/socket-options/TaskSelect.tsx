'use client'
import React, { useState, useEffect } from 'react';
import { getTasksForService } from '@/constants/socket-schema';

interface TaskSelectProps {
  onTaskChange?: (task: string) => void;
  service: string;
  value?: string;
}

const TaskSelect: React.FC<TaskSelectProps> = ({ onTaskChange, service, value }) => {
  const [task, setTask] = useState<string>(value || '');
  const [prevService, setPrevService] = useState<string>(service);
  const tasks = service ? getTasksForService(service) : [];
  
  console.log('TaskSelect: service=', service, 'task=', task);
  
  // Reset task when service changes
  useEffect(() => {
    // Only reset if the service actually changed
    if (service !== prevService) {
      console.log('TaskSelect: Resetting task due to service change from', prevService, 'to', service);
      setPrevService(service);
      setTask('');
      if (onTaskChange) {
        onTaskChange('');
      }
    }
  }, [service, prevService, onTaskChange]);
  
  // Update internal state when parent prop changes
  useEffect(() => {
    if (value !== undefined && value !== task) {
      console.log('TaskSelect: Updating task from', task, 'to', value);
      setTask(value);
    }
  }, [value, task]);
  
  const handleTaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTask = e.target.value;
    console.log('TaskSelect: handleTaskChange called with', newTask);
    setTask(newTask);
    if (onTaskChange) {
      onTaskChange(newTask);
    }
  };

  if (!service) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Task:
        </label>
        <select
          value={task}
          onChange={handleTaskChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
        >
          <option value="">Select Task</option>
          {tasks.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

export default TaskSelect; 