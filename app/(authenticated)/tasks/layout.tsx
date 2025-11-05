import { Metadata } from 'next';
import { TaskProviderWrapper } from '@/features/tasks/components/TaskProviderWrapper';
import { createRouteMetadata } from '@/utils/route-metadata';

export const metadata: Metadata = createRouteMetadata('/tasks', {
  title: 'Tasks | AI Matrx',
  description: 'Manage your tasks and projects efficiently with our powerful task management system',
  additionalMetadata: {
    keywords: ['tasks', 'task management', 'projects', 'productivity', 'todo', 'checklist'],
    openGraph: {
      title: 'Tasks | AI Matrx',
      description: 'Manage your tasks and projects efficiently',
      type: 'website',
    },
  },
});

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskProviderWrapper>
      <div className="h-page flex flex-col bg-textured">
        {/* Uses h-page utility: auto-adjusts for header height (Mobile: 3rem, Desktop: 2.5rem) */}
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </TaskProviderWrapper>
  );
}

