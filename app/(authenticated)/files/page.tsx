"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MultiBucketFileTree from "@/components/file-system/draggable/MultiBucketFileTree";
import { FileSystemNode, AvailableBuckets } from "@/lib/redux/fileSystem/types";
import { Upload } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileFilesView from "./mobile/MobileFilesView";
import FilePreviewSheet from "@/components/ui/file-preview/FilePreviewSheet";
import { FileUploadDialog } from "@/components/file-system/upload/FileUploadDialog";
import { getFileDetailsByUrl } from "@/utils/file-operations/constants";
import { useToast } from "@/components/ui";
import FileSystemManager from "@/utils/file-operations/FileSystemManager";

export default function AllFilesPage() {
  const isMobile = useIsMobile();
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>(
    "userContent",
  );
  const [previewFile, setPreviewFile] = useState<{
    node: FileSystemNode;
    bucket: AvailableBuckets;
    url?: string;
    expiresAt?: Date;
    isPublic?: boolean;
  } | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
    setSelectedBucket(bucket);
  }, []);

  useEffect(() => {
    if (!previewFile || previewFile.url) return;

    const fetchUrl = async () => {
      setIsLoadingUrl(true);
      try {
        const fileSystemManager = FileSystemManager.getInstance();
        const urlResult = await fileSystemManager.getFileUrl(
          previewFile.bucket,
          previewFile.node.storagePath,
          { expiresIn: 3600 },
        );
        setPreviewFile((prev) =>
          prev
            ? {
                ...prev,
                url: urlResult.url,
                expiresAt: urlResult.expiresAt,
                isPublic: urlResult.isPublic,
              }
            : null,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load file";
        toast({
          title: "Error loading file",
          description: errorMessage,
          variant: "destructive",
        });
        setPreviewFile(null);
      } finally {
        setIsLoadingUrl(false);
      }
    };

    fetchUrl();
  }, [previewFile?.node.itemId, toast]);

  const handleViewFile = useCallback(
    (node: FileSystemNode) => {
      if (node.contentType === "FOLDER") return;
      if (!selectedBucket) return;
      setPreviewFile({ node, bucket: selectedBucket });
    },
    [selectedBucket],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  if (isMobile) {
    return <MobileFilesView />;
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
          <p className="text-xs text-muted-foreground">
            {selectedBucket ? (
              <>
                <span className="font-medium text-foreground">
                  {selectedBucket}
                </span>
              </>
            ) : (
              "No bucket selected"
            )}
          </p>
          {selectedBucket && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUploadDialogOpen(true)}
              className="h-6 px-2 text-xs gap-1"
            >
              <Upload className="h-3 w-3" />
              Upload
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-1 py-1">
          <MultiBucketFileTree
            defaultExpandedBuckets={["userContent"]}
            onViewFile={handleViewFile}
            onBucketSelect={handleBucketSelect}
          />
        </div>
      </div>

      {previewFile && (
        <FilePreviewSheet
          isOpen={true}
          onClose={handleClosePreview}
          file={{
            url: previewFile.url || "",
            type:
              previewFile.node.metadata?.mimetype || "application/octet-stream",
            details: previewFile.url
              ? {
                  ...getFileDetailsByUrl(
                    previewFile.url,
                    previewFile.node.metadata,
                  ),
                  bucket: previewFile.bucket,
                  path: previewFile.node.storagePath,
                  expiresAt: previewFile.expiresAt,
                  isPublic: previewFile.isPublic,
                }
              : undefined,
          }}
        />
      )}

      {selectedBucket && (
        <FileUploadDialog
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          bucket={selectedBucket}
          initialPath={undefined}
        />
      )}
    </>
  );
}
