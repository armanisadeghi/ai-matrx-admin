'use client';

import React from 'react';
import { TaskProvider } from '@/features/tasks';
import Sidebar from '@/features/tasks/components/Sidebar';
import TaskContent from '@/features/tasks/components/TaskContent';

/**
 * Tasks Page - Main task management interface
 * 
 * Route: /tasks
 * Note: Uses h-full to work with app layout (not h-screen)
 */
export default function TasksPage() {
  return (
    <div className="h-full w-full overflow-hidden">
      <TaskProvider>
        <div className="flex h-full w-full bg-textured">
          <Sidebar />
          <TaskContent />
        </div>
      </TaskProvider>
    </div>
  );
}
