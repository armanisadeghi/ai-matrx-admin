import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tasks | AI Matrx',
  description: 'Manage your tasks and projects',
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

