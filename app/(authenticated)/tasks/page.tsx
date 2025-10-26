import React from 'react';
import Sidebar from '@/features/tasks/components/Sidebar';
import TaskContent from '@/features/tasks/components/TaskContent';

/**
 * Tasks Page - Main task management interface
 * 
 * Route: /tasks
 * Note: Loading state is handled by loading.tsx
 * TaskProvider and layout structure is in layout.tsx
 */
export default function TasksPage() {
  return (
    <div className="flex w-full h-full">
      <Sidebar />
      <TaskContent />
    </div>
  );
}
