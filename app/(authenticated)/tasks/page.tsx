'use client';

import React from 'react';
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
    <div className="w-full overflow-hidden" style={{ height: '100vh' }}>
        <div className="flex w-full bg-textured" style={{ height: '100vh' }}>
          <Sidebar />
          <TaskContent />
        </div>
    </div>
  );
}
