// StorageNavigator.tsx
"use client";

import { ChevronLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BucketListSelect from "../buckets/BucketListSelect";
import StorageTree from "./StorageTree";
import { TreeItem } from "./types";
import { useStorageNavigation } from "./useStorageNavigation";

type StorageNavigatorProps = {
    onFileSelect: (bucketName: string, path: string, file: TreeItem) => void;
  };
  
  export default function StorageNavigator({ onFileSelect }: StorageNavigatorProps) {
    const {
      selectedBucket,
      isViewingBuckets,
      handleBucketSelect,
      handleBackToBuckets
    } = useStorageNavigation();
  
  // StorageNavigator.tsx
  const handleFileSelection = (path: string, file: TreeItem) => {
    // Pass the bucket name along with the path and file
    onFileSelect(selectedBucket, path, {
      ...file,
      type: 'file',
      metadata: file.metadata || null
    });
  };

  return (
    <Card className="flex flex-col h-[400px]">
      <div className="border-b p-2">
        <div className="flex items-center gap-2">
          {!isViewingBuckets && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToBuckets}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="font-medium">
              {isViewingBuckets ? "Storage Buckets" : selectedBucket}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isViewingBuckets ? (
          <BucketListSelect
            value={selectedBucket}
            onValueChange={handleBucketSelect}
          />
        ) : (
          <StorageTree
            bucketName={selectedBucket}
            onFileSelect={handleFileSelection}
          />
        )}
      </div>
    </Card>
  );
}
