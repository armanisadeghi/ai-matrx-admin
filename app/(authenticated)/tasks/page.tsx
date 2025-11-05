'use client';

import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from '@/features/tasks/components/Sidebar';
import TaskContentNew from '@/features/tasks/components/TaskContentNew';
import MobileTasksView from '@/features/tasks/components/mobile/MobileTasksView';

/**
 * Tasks Page - Main task management interface
 * 
 * Route: /tasks
 * Note: Loading state is handled by loading.tsx
 * TaskProvider and layout structure is in layout.tsx
 * 
 * Automatically switches between desktop and mobile views based on screen size
 */
export default function TasksPage() {
  const isMobile = useIsMobile();

  // Mobile view - iOS-inspired single-column navigation
  if (isMobile) {
    return <MobileTasksView />;
  }

  // Desktop view - Three-column layout
  return (
    <div className="flex w-full h-page">
      <Sidebar />
      <TaskContentNew />
    </div>
  );
}
