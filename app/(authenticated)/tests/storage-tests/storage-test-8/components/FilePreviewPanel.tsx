"use client";

import React, { useEffect, useState } from "react";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import { useAppSelector } from "@/lib/redux/hooks";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import ImagePreview from "@/components/ui/file-preview/previews/ImagePreview";
import TextPreview from "@/components/ui/file-preview/previews/TextPreview";
import CodePreview from "@/components/ui/file-preview/previews/CodePreview";
import VideoPreview from "@/components/ui/file-preview/previews/VideoPreview";
import AudioPreview from "@/components/ui/file-preview/previews/AudioPreview";
import PDFPreview from "@/components/ui/file-preview/previews/PDFPreview";
import DataPreview from "@/components/ui/file-preview/previews/DataPreview";
import GenericPreview from "@/components/ui/file-preview/previews/GenericPreview";
import { getFileDetailsByUrl } from "@/utils/file-operations/constants";
import { FileIcon, Loader2, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/components/ui/file-preview/utils/formatting";

export default function FilePreviewPanel() {
  const { activeBucket, getHooksForBucket } = useFileSystem();
  const hooks = getHooksForBucket(activeBucket);
  
  const selectors = createFileSystemSelectors(activeBucket);
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
        const FileSystemManager = (await import("@/utils/file-operations/FileSystemManager")).default;
        const fileSystemManager = FileSystemManager.getInstance();
        
        // Use the smart URL getter - automatically handles public vs private
        const urlResult = await fileSystemManager.getFileUrl(activeBucket, activeNode.storagePath, {
          expiresIn: 3600 // 1 hour
        });
        
        if (urlResult.expiresAt) {
          console.log("⏰ Expires at:", urlResult.expiresAt.toLocaleString());
        }
        
        setPublicUrl(urlResult.url);
        
        // Fetch the file content
        const response = await fetch(urlResult.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        setFileBlob(blob);
        
      } catch (err) {
        console.error("❌ Error loading file:", err);
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setIsLoadingUrl(false);
      }
    };

    fetchPublicUrl();
  }, [activeNode?.itemId, activeBucket]);

  // No file selected
  if (!activeNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <FileIcon className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No file selected</p>
        <p className="text-sm">Select a file from the tree to preview</p>
      </div>
    );
  }

  // Folder selected
  if (activeNode.contentType === "FOLDER") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <FolderOpen className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">{activeNode.name}</p>
        <p className="text-sm">This is a folder</p>
      </div>
    );
  }

  // Loading state
  if (isLoadingUrl || !publicUrl || !fileBlob) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Loading file preview...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-destructive">
        <FileIcon className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Error loading file</p>
        <p className="text-sm">{error}</p>
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
    const extension = activeNode.extension?.toLowerCase() || '';
    
    // Check for PDF first
    if (extension === 'pdf' || mimeType.includes('pdf')) {
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
      {/* File Info Header */}
      <div className="p-4 border-b flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <FileIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{activeNode.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatBytes(activeNode.metadata?.size || 0)}</span>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
              {activeNode.extension && (
                <>
                  <span>•</span>
                  <span className="uppercase">{activeNode.extension}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {renderPreview()}
      </div>
    </div>
  );
}

