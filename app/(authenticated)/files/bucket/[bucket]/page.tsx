"use client";

import React, { useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { FileTree } from "@/components/file-system/draggable";
import { FileDetailsPanel } from "@/components/file-system/details";
import { AvailableBuckets } from "@/lib/redux/fileSystem/types";
import { BUCKET_ROUTES } from "../../file-routes.config";
import { FolderOpen } from "lucide-react";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";

export default function BucketPage() {
  const params = useParams();
  const bucketName = params.bucket as AvailableBuckets;
  const { setActiveBucket } = useFileSystem();

  useEffect(() => {
    setActiveBucket(bucketName);
  }, [bucketName, setActiveBucket]);

  const routeInfo = useMemo(() => {
    return (
      BUCKET_ROUTES[bucketName] || {
        label: bucketName,
        icon: FolderOpen,
        description: `Browse files in ${bucketName} bucket`,
      }
    );
  }, [bucketName]);

  const Icon = routeInfo.icon;

  return (
    <div className="flex h-full">
      <div className="w-72 flex flex-col border-r border-border/60">
        <div className="flex items-center gap-1.5 border-b border-border/60 px-3 py-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">{routeInfo.label}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-1 py-1">
          <FileTree />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <FileDetailsPanel bucketName={bucketName} />
      </div>
    </div>
  );
}
