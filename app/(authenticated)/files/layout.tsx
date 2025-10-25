import React from 'react';
import { FileManagerSidebar } from './components/FileManagerSidebar';

export const metadata = {
  title: 'File Manager | AI Matrx',
  description: 'Manage your files across all storage buckets',
};

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-textured">
      <FileManagerSidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

