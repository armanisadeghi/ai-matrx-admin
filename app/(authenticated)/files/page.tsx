'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MultiBucketFileTree from '@/components/file-system/draggable/MultiBucketFileTree';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { Database, Upload } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileFilesView from './mobile/MobileFilesView';
import FilePreviewSheet from '@/components/ui/file-preview/FilePreviewSheet';
import { FileUploadDialog } from '@/components/file-system/upload/FileUploadDialog';
import { getFileDetailsByUrl } from '@/utils/file-operations/constants';
import { useToast } from '@/components/ui';
import FileSystemManager from '@/utils/file-operations/FileSystemManager';

export default function AllFilesPage() {
  const isMobile = useIsMobile();
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>('userContent');
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

  // Get the current folder path for upload dialog
  const getCurrentFolderPath = useCallback((): string => {
    if (!selectedBucket) return "";
    
    // Get Redux selectors for the selected bucket
    const { createFileSystemSelectors } = require('@/lib/redux/fileSystem/selectors');
    const selectors = createFileSystemSelectors(selectedBucket);
    
    // This would need to be called within a component with access to useAppSelector
    // For now, we'll pass undefined and let the dialog determine it from Redux state
    return "";
  }, [selectedBucket]);

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

  const handleViewFile = useCallback((node: FileSystemNode) => {
    if (node.contentType === 'FOLDER') return;
    if (!selectedBucket) return;
    
    // Immediately set preview file to trigger sheet opening
    setPreviewFile({ node, bucket: selectedBucket });
  }, [selectedBucket]);

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  // Mobile view - iOS-inspired single-column navigation
  if (isMobile) {
    return <MobileFilesView />;
  }

  // Desktop view - Sidebar + preview sheet
  return (
    <>
      <div className="flex h-page gap-4 p-4">
        {/* File Tree with Multiple Buckets */}
        <Card className="w-96 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">All Buckets</CardTitle>
              </div>
              {selectedBucket && (
                <Button 
                  size="sm" 
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="h-8"
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  Upload
                </Button>
              )}
            </div>
            {selectedBucket && (
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Active: {selectedBucket}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full overflow-y-auto px-2 pb-2">
              <MultiBucketFileTree 
                defaultExpandedBuckets={['userContent']}
                onViewFile={handleViewFile}
                onBucketSelect={handleBucketSelect}
              />
            </div>
          </CardContent>
        </Card>

        {/* Placeholder Panel */}
        <Card className="flex-1 overflow-hidden flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Database className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a file to preview</p>
            <p className="text-sm">Click on any file in the tree to view it</p>
          </div>
        </Card>
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

      {/* File Upload Dialog */}
      {selectedBucket && (
        <FileUploadDialog
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          bucket={selectedBucket}
          initialPath={undefined} // Let dialog determine from Redux state
        />
      )}
    </>
  );
}

