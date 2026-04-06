"use client";

import React, { useState, useCallback } from "react";
import MultiBucketFileTree from "@/components/file-system/draggable/MultiBucketFileTree";
import { FileDetailsPanel } from "@/components/file-system/details";
import { FileSystemNode, AvailableBuckets } from "@/lib/redux/fileSystem/types";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

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
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>(
    null,
  );

  const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
    setSelectedBucket(bucket);
  }, []);

  const handleViewFile = useCallback((node: FileSystemNode) => {
    console.log("View file:", node);
  }, []);

  return (
    <div className="flex h-full">
      <div className="w-72 flex flex-col border-r border-border/60">
        <div className="flex items-center gap-1.5 border-b border-border/60 px-3 py-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">{title}</span>
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] px-1.5 py-0"
          >
            {fileCategory}
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto px-1 py-1">
          <MultiBucketFileTree
            defaultExpandedBuckets={["userContent"]}
            onViewFile={handleViewFile}
            onBucketSelect={handleBucketSelect}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <FileDetailsPanel bucketName={selectedBucket || undefined} />
      </div>
    </div>
  );
}
