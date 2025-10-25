'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import MultiBucketFileTree from '@/components/file-system/draggable/MultiBucketFileTree';
import { FileDetailsPanel } from '@/components/file-system/details';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { FolderTree } from 'lucide-react';

export default function MultiBucketFileExplorer() {
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>(null);

  const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
    setSelectedBucket(bucket);
  }, []);

  const handleViewFile = useCallback((node: FileSystemNode) => {
    console.log('View file:', node);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Multi-Bucket File Explorer</h1>
        <p className="text-muted-foreground">
          Browse files across multiple storage buckets without a selector. Expand any bucket to view its contents.
        </p>
      </div>

      <div className="flex gap-6">
        {/* File Tree with Multiple Buckets */}
        <Card className="w-96 h-[calc(100vh-240px)] flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">All Buckets</CardTitle>
            </div>
            {selectedBucket && (
              <p className="text-xs text-muted-foreground font-medium">
                Active: {selectedBucket}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full overflow-y-auto px-2 pb-2">
              <MultiBucketFileTree 
                defaultExpandedBuckets={['userContent']}
                onViewFile={handleViewFile}
                onBucketSelect={handleBucketSelect}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview/Details Panel */}
        <Card className="flex-1 h-[calc(100vh-240px)] overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>File Details</CardTitle>
            {selectedBucket && (
              <p className="text-xs text-muted-foreground">Viewing from: {selectedBucket}</p>
            )}
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <FileDetailsPanel bucketName={selectedBucket || undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

