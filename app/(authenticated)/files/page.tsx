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
  } | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
    setSelectedBucket(bucket);
  }, []);

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

  const handleViewFile = useCallback((node: FileSystemNode) => {
    if (node.contentType === 'FOLDER') return;
    if (!selectedBucket) return;
    
    // Immediately set preview file to trigger sheet opening
    setPreviewFile({ node, bucket: selectedBucket });
  }, [selectedBucket]);

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
    setFileUrl('');
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
            url: fileUrl || '',
            type: previewFile.node.metadata?.mimetype || 'application/octet-stream',
            details: fileUrl ? getFileDetailsByUrl(fileUrl, previewFile.node.metadata) : undefined,
          }}
        />
      )}

      {/* File Upload Dialog */}
      {selectedBucket && (
        <FileUploadDialog
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          bucket={selectedBucket}
        />
      )}
    </>
  );
}

