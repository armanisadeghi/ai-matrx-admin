'use client';

import { TaskProvider } from '@/features/tasks/context/TaskContext';

/**
 * Client-side wrapper for TaskProvider
 * Separated from layout.tsx to allow the layout to remain a server component
 */
export function TaskProviderWrapper({ children }: { children: React.ReactNode }) {
  return <TaskProvider>{children}</TaskProvider>;
}

