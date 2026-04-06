"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { AvailableBuckets } from "@/lib/redux/fileSystem/types";
import ImagePreview from "@/components/ui/file-preview/previews/ImagePreview";
import TextPreview from "@/components/ui/file-preview/previews/TextPreview";
import CodePreview from "@/components/ui/file-preview/previews/CodePreview";
import VideoPreview from "@/components/ui/file-preview/previews/VideoPreview";
import AudioPreview from "@/components/ui/file-preview/previews/AudioPreview";
const DataPreview = dynamic(
  () => import("@/components/ui/file-preview/previews/DataPreview"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  },
);
import GenericPreview from "@/components/ui/file-preview/previews/GenericPreview";
import { getFileDetailsByUrl } from "@/utils/file-operations/constants";
import { FileIcon, Loader2, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/components/ui/file-preview/utils/formatting";
import { useToast } from "@/components/ui";

// Dynamic import for PDFPreview to avoid SSR issues with DOMMatrix
const PDFPreview = dynamic(
  () => import("@/components/ui/file-preview/previews/PDFPreview"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  },
);

interface FileDetailsPanelProps {
  bucketName?: AvailableBuckets;
}

export function FileDetailsPanel({
  bucketName: explicitBucket,
}: FileDetailsPanelProps) {
  const { activeBucket } = useFileSystem();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Use explicit bucket if provided, otherwise fall back to activeBucket
  const bucketName = explicitBucket || activeBucket;
  const slice = createFileSystemSlice(bucketName);
  const selectors = createFileSystemSelectors(bucketName);
  const { actions } = slice;

  const activeNode = useAppSelector(selectors.selectActiveNode);

  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch public URL when active node changes
  useEffect(() => {
    if (!activeNode || activeNode.contentType === "FOLDER") {
      setPublicUrl(null);
      setFileBlob(null);
      setError(null);
      return;
    }

    const fetchPublicUrl = async () => {
      setIsLoadingUrl(true);
      setError(null);

      try {
        // Get the FileSystemManager instance
        const FileSystemManager = (
          await import("@/utils/file-operations/FileSystemManager")
        ).default;
        const fileSystemManager = FileSystemManager.getInstance();

        // Use the smart URL getter - automatically handles public vs private
        const urlResult = await fileSystemManager.getFileUrl(
          bucketName,
          activeNode.storagePath,
          {
            expiresIn: 3600, // 1 hour
          },
        );

        setPublicUrl(urlResult.url);

        // Fetch the file content
        const response = await fetch(urlResult.url);
        if (!response.ok) {
          const errorMsg = `Failed to load file - ${response.status} ${response.statusText}`;

          toast({
            title: "Failed to load file",
            description: `${response.status} error: The file may not be accessible. Check if the file is public or if you have the correct permissions.`,
            variant: "destructive",
          });

          throw new Error(errorMsg);
        }

        const blob = await response.blob();
        setFileBlob(blob);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load file";

        setError(errorMessage);

        // Only show toast if we haven't already shown one
        if (!errorMessage.includes("Failed to load file")) {
          toast({
            title: "Error loading file",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        setIsLoadingUrl(false);
      }
    };

    fetchPublicUrl();
  }, [activeNode?.itemId, bucketName]);

  if (!activeNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full gap-2">
        <FileIcon className="h-8 w-8 opacity-20" />
        <p className="text-xs">Select a file to preview</p>
      </div>
    );
  }

  if (activeNode.contentType === "FOLDER") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full gap-2">
        <FolderOpen className="h-8 w-8 opacity-20" />
        <p className="text-sm font-medium text-foreground">{activeNode.name}</p>
        <p className="text-xs">Folder</p>
      </div>
    );
  }

  if (isLoadingUrl || !publicUrl || !fileBlob) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-destructive h-full gap-2">
        <FileIcon className="h-8 w-8 opacity-20" />
        <p className="text-sm font-medium">Error loading file</p>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  // Get file details
  const fileDetails = getFileDetailsByUrl(publicUrl, activeNode.metadata);
  const category = fileDetails?.category || "UNKNOWN";
  const mimeType = activeNode.metadata?.mimetype || fileBlob.type;

  // Preview props
  const previewProps = {
    file: {
      url: publicUrl,
      type: mimeType,
      blob: fileBlob,
      details: fileDetails,
    },
    url: publicUrl,
    blob: fileBlob,
    metadata: activeNode.metadata,
    isLoading: false, // We already loaded, so always false here
  };

  // Render appropriate preview component based on category
  const renderPreview = () => {
    const extension = activeNode.extension?.toLowerCase() || "";

    // Check for PDF first
    if (extension === "pdf" || mimeType.includes("pdf")) {
      return <PDFPreview {...previewProps} isLoading={false} />;
    }

    switch (category) {
      case "IMAGE":
        return <ImagePreview {...previewProps} />;
      case "VIDEO":
        return <VideoPreview {...previewProps} isLoading={false} />;
      case "AUDIO":
        return <AudioPreview {...previewProps} isLoading={false} />;
      case "DOCUMENT":
        return <TextPreview {...previewProps} />;
      case "CODE":
        return <CodePreview {...previewProps} />;
      case "DATA":
        return <DataPreview {...previewProps} isLoading={false} />;
      default:
        return <GenericPreview {...previewProps} />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 flex-shrink-0">
        <FileIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-medium truncate">{activeNode.name}</span>
        <span className="text-[10px] text-muted-foreground flex-shrink-0">
          {formatBytes(activeNode.metadata?.size || 0)}
        </span>
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 flex-shrink-0"
        >
          {category}
        </Badge>
        {activeNode.extension && (
          <span className="text-[10px] text-muted-foreground uppercase flex-shrink-0">
            {activeNode.extension}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 min-h-0">{renderPreview()}</div>
    </div>
  );
}
