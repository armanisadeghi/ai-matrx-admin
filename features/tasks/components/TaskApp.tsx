import React, { useState } from 'react';
import Sidebar from '@/features/tasks/components/Sidebar';
import TaskContentNew from '@/features/tasks/components/TaskContentNew';
import { TaskProvider, useTaskContext } from '@/features/tasks/context/TaskContext';

export default function TaskApp() {
  return (
    <TaskProvider>
      <div className="flex h-full w-full bg-textured text-gray-900 dark:bg-gray-900 dark:text-white">
        <Sidebar />
        <TaskContentNew />
      </div>
    </TaskProvider>
  );
}
