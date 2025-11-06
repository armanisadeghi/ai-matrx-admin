'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MobileFilesList from './MobileFilesList';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import FilePreviewSheet from '@/components/ui/file-preview/FilePreviewSheet';
import { getFileDetailsByUrl } from '@/utils/file-operations/constants';
import { useToast } from '@/components/ui';
import FileSystemManager from '@/utils/file-operations/FileSystemManager';

export default function MobileFilesView() {
  const [previewFile, setPreviewFile] = useState<{
    node: FileSystemNode;
    bucket: AvailableBuckets;
    url?: string;
    expiresAt?: Date;
    isPublic?: boolean;
  } | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const { toast } = useToast();

  // Fetch file URL when preview file changes
  useEffect(() => {
    if (!previewFile || previewFile.url) {
      // If we already have a URL, no need to fetch
      return;
    }

    const fetchUrl = async () => {
      setIsLoadingUrl(true);
      try {
        const fileSystemManager = FileSystemManager.getInstance();
        const urlResult = await fileSystemManager.getFileUrl(
          previewFile.bucket,
          previewFile.node.storagePath,
          { expiresIn: 3600 }
        );
        
        // Update the preview file with URL metadata
        setPreviewFile(prev => prev ? {
          ...prev,
          url: urlResult.url,
          expiresAt: urlResult.expiresAt,
          isPublic: urlResult.isPublic
        } : null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
        toast({
          title: 'Error loading file',
          description: errorMessage,
          variant: 'destructive',
        });
        setPreviewFile(null);
      } finally {
        setIsLoadingUrl(false);
      }
    };

    fetchUrl();
  }, [previewFile?.node.itemId, toast]);

  const handleFileSelect = useCallback((node: FileSystemNode, bucket: AvailableBuckets | null) => {
    if (node.contentType === 'FOLDER' || !bucket) return;
    
    // Immediately set preview file to trigger sheet opening
    setPreviewFile({ node, bucket });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  return (
    <>
      <div className="h-page w-full bg-background overflow-hidden">
        <MobileFilesList onFileSelect={handleFileSelect} />
      </div>

      {/* File Preview Sheet */}
      {previewFile && (
        <FilePreviewSheet
          isOpen={true}
          onClose={handleClosePreview}
          file={{
            url: previewFile.url || '',
            type: previewFile.node.metadata?.mimetype || 'application/octet-stream',
            details: previewFile.url ? {
              ...getFileDetailsByUrl(previewFile.url, previewFile.node.metadata),
              bucket: previewFile.bucket,
              path: previewFile.node.storagePath,
              expiresAt: previewFile.expiresAt,
              isPublic: previewFile.isPublic,
            } : undefined,
          }}
        />
      )}
    </>
  );
}

