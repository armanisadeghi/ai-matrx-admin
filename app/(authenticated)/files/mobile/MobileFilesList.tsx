'use client';

import React, { useState, useCallback } from 'react';
import { ChevronRight, Database, FolderOpen, FileIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import MultiBucketFileTree from '@/components/file-system/draggable/MultiBucketFileTree';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import MobileFileUpload from './MobileFileUpload';

interface MobileFilesListProps {
  onFileSelect: (node: FileSystemNode, bucket: AvailableBuckets | null) => void;
}

export default function MobileFilesList({ onFileSelect }: MobileFilesListProps) {
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>('userContent');

  const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
    setSelectedBucket(bucket);
  }, []);

  const handleViewFile = useCallback((node: FileSystemNode) => {
    onFileSelect(node, selectedBucket);
  }, [onFileSelect, selectedBucket]);

  const handleUploadComplete = useCallback(() => {
    // Files list will auto-refresh via Redux
  }, []);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Files</h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedBucket && (
              <MobileFileUpload bucket={selectedBucket} onUploadComplete={handleUploadComplete} />
            )}
          </div>
        </div>
        {selectedBucket && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <FolderOpen size={16} className="text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">
                Active: {selectedBucket}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
        <Card className="m-3 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">All Buckets</CardTitle>
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
      </div>

      {/* Helper text */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground text-center">
          Tap any file to view details
        </p>
      </div>
    </div>
  );
}

