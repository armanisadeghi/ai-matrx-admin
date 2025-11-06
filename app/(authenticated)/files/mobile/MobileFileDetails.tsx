'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileDetailsPanel } from '@/components/file-system/details';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';

interface MobileFileDetailsProps {
  selectedNode: FileSystemNode;
  selectedBucket: AvailableBuckets | null;
  onBack: () => void;
}

export default function MobileFileDetails({ selectedNode, selectedBucket, onBack }: MobileFileDetailsProps) {
  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-3 px-3 py-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 h-9 w-9">
            <ChevronLeft size={22} />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              {selectedNode.name}
            </h2>
            {selectedBucket && (
              <p className="text-xs text-muted-foreground truncate">
                {selectedBucket}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <div className="flex-1 overflow-hidden">
        <Card className="m-3 h-[calc(100%-1.5rem)] overflow-hidden flex flex-col">
          <CardHeader className="border-b flex-shrink-0">
            <CardTitle>File Details</CardTitle>
            {selectedBucket && (
              <p className="text-xs text-muted-foreground">Viewing from: {selectedBucket}</p>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <FileDetailsPanel bucketName={selectedBucket || undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

