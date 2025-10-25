'use client';

import React, { useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileTree } from '@/components/file-system/draggable';
import { FileDetailsPanel } from '@/components/file-system/details';
import { AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { BUCKET_ROUTES } from '../../file-routes.config';
import { FolderOpen } from 'lucide-react';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';

export default function BucketPage() {
  const params = useParams();
  const bucketName = params.bucket as AvailableBuckets;
  const { setActiveBucket } = useFileSystem();

  // Set the active bucket when component mounts or bucket changes
  useEffect(() => {
    setActiveBucket(bucketName);
  }, [bucketName, setActiveBucket]);

  const routeInfo = useMemo(() => {
    return BUCKET_ROUTES[bucketName] || {
      label: bucketName,
      icon: FolderOpen,
      description: `Browse files in ${bucketName} bucket`,
    };
  }, [bucketName]);

  const Icon = routeInfo.icon;

  return (
    <div className="flex h-full gap-4 p-4">
      {/* File Tree for Single Bucket */}
      <Card className="w-96 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{routeInfo.label}</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {routeInfo.description}
          </p>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto px-2 pb-2">
            <FileTree />
          </div>
        </CardContent>
      </Card>

      {/* Preview/Details Panel */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>File Details</CardTitle>
          <p className="text-xs text-muted-foreground">Viewing from: {bucketName}</p>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          <FileDetailsPanel bucketName={bucketName} />
        </CardContent>
      </Card>
    </div>
  );
}

