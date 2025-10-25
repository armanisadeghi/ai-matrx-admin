'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import BucketSelector from '@/components/file-system/tree/BucketSelector';
import FileTree from '@/components/file-system/draggable/FileTree';
import { FileDetailsPanel } from '@/components/file-system/details';
import { FolderTree } from 'lucide-react';

export default function FileExplorer() {
  const { error } = useFileSystem();

  if (error) {
    return (
      <div className="text-destructive p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">File Explorer</h1>
        <p className="text-muted-foreground">
          Browse and manage your files with drag-and-drop, context menus, and real-time updates.
        </p>
      </div>

      <div className="flex gap-6">
        {/* File Tree Sidebar */}
        <Card className="w-96 h-[calc(100vh-240px)] flex flex-col overflow-hidden">
          <CardHeader className="pb-3 space-y-3">
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">File Tree</CardTitle>
            </div>
            <BucketSelector />
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full overflow-y-auto px-2 pb-2">
              <FileTree />
            </div>
          </CardContent>
        </Card>

        {/* Preview/Details Panel */}
        <Card className="flex-1 h-[calc(100vh-240px)] overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>File Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <FileDetailsPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
