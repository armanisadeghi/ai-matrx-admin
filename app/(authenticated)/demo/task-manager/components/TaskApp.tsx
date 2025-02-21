import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TaskContent from '../components/TaskContent';
import { TaskProvider, useTaskContext } from '../context/TaskContext';

export default function TaskApp() {
  return (
    <TaskProvider>
      <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
        <Sidebar />
        <TaskContent />
      </div>
    </TaskProvider>
  );
}
