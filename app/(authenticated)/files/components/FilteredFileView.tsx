'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import MultiBucketFileTree from '@/components/file-system/draggable/MultiBucketFileTree';
import { FileDetailsPanel } from '@/components/file-system/details';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import type { LucideIcon } from 'lucide-react';

interface FilteredFileViewProps {
  title: string;
  description: string;
  icon: LucideIcon;
  fileCategory: string;
}

export function FilteredFileView({
  title,
  description,
  icon: Icon,
  fileCategory,
}: FilteredFileViewProps) {
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>(null);

  const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
    setSelectedBucket(bucket);
  }, []);

  const handleViewFile = useCallback((node: FileSystemNode) => {
    console.log('View file:', node);
  }, []);

  // TODO: Implement actual filtering logic
  // This will filter the file tree to only show files of the specified category
  // For now, it shows all files (filtering will be added in the next phase)

  return (
    <div className="flex h-full gap-4 p-4">
      {/* File Tree with Multiple Buckets (Filtered) */}
      <Card className="w-96 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          {selectedBucket && (
            <p className="text-xs text-muted-foreground font-medium mt-2">
              Active: {selectedBucket}
            </p>
          )}
          <div className="mt-2 px-2 py-1 bg-accent rounded text-xs">
            <span className="font-medium">Filter:</span> {fileCategory} files only
          </div>
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

