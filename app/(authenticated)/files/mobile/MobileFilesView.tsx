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
  } | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const { toast } = useToast();

  // Fetch file URL when preview file changes
  useEffect(() => {
    if (!previewFile) {
      setFileUrl('');
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
        setFileUrl(urlResult.url);
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
  }, [previewFile, toast]);

  const handleFileSelect = useCallback((node: FileSystemNode, bucket: AvailableBuckets | null) => {
    if (node.contentType === 'FOLDER' || !bucket) return;
    
    // Immediately set preview file to trigger sheet opening
    setPreviewFile({ node, bucket });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
    setFileUrl('');
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
            url: fileUrl || '',
            type: previewFile.node.metadata?.mimetype || 'application/octet-stream',
            details: fileUrl ? getFileDetailsByUrl(fileUrl, previewFile.node.metadata) : undefined,
          }}
        />
      )}
    </>
  );
}

