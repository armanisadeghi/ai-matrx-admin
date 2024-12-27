'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import BucketSelector from '@/components/file-system/tree/BucketSelector';
import FileTree from '@/components/file-system/draggable/FileTree';
import { TableLoadingComponent } from '@/components/matrx/LoadingComponents';

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
        <TableLoadingComponent />
      ) : (
        <Card className="p-4">
          <FileTree />
        </Card>
      )}
    </div>
  );
}
