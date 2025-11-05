'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import MultiBucketFileTree from '@/components/file-system/draggable/MultiBucketFileTree';
import { FileDetailsPanel } from '@/components/file-system/details';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { Database } from 'lucide-react';

export default function AllFilesPage() {
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>(null);

  const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
    setSelectedBucket(bucket);
  }, []);

  const handleViewFile = useCallback((node: FileSystemNode) => {
    console.log('View file:', node);
  }, []);

  return (
    <div className="flex h-page gap-4 p-4">
      {/* File Tree with Multiple Buckets */}
      <Card className="w-96 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">All Buckets</CardTitle>
          </div>
          {selectedBucket && (
            <p className="text-xs text-muted-foreground font-medium mt-1">
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
      <Card className="flex-1 overflow-hidden">
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
  );
}

