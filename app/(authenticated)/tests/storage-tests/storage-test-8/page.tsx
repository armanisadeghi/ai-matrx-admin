'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import BucketSelector from './components/FileExplorer/BucketSelector';
import FileTree from './components/FileExplorer/FileTree';

export default function FileExplorer() {
  const { activeBucket, isInitialized, isLoading, error } = useFileSystem();

  if (error) {
    return (
      <div className="text-destructive p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <BucketSelector />
      {isLoading && !isInitialized ? (
        <div className="text-muted-foreground">Initializing...</div>
      ) : (
        <Card className="p-4">
          <FileTree />
        </Card>
      )}
    </div>
  );
}
