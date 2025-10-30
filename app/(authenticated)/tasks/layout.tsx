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
      <div className="h-[calc(100vh-2.5rem)] flex flex-col bg-textured">
        {/* Account for the fixed header (h-10 = 2.5rem) */}
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </TaskProviderWrapper>
  );
}

