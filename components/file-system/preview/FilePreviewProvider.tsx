"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { useAppDispatch } from '@/lib/redux/hooks';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import FilePreviewSheet from '@/components/ui/file-preview/FilePreviewSheet';
import { useToast } from '@/components/ui';
import { getFileDetailsByUrl } from '@/utils/file-operations/constants';

interface FilePreviewContextType {
  openPreview: (node: FileSystemNode, bucketName: AvailableBuckets) => Promise<void>;
  closePreview: () => void;
  isOpen: boolean;
}

const FilePreviewContext = createContext<FilePreviewContextType | undefined>(undefined);

export function useFilePreview() {
  const context = useContext(FilePreviewContext);
  if (!context) {
    throw new Error('useFilePreview must be used within FilePreviewProvider');
  }
  return context;
}

export function FilePreviewProvider({ children }: { children: React.ReactNode }) {
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    type: string;
    details: any;
  } | null>(null);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const openPreview = useCallback(async (node: FileSystemNode, bucketName: AvailableBuckets) => {
    if (node.contentType !== 'FILE') return;
    
    try {
      const slice = createFileSystemSlice(bucketName);
      const { actions } = slice;

      // Select the node
      dispatch(actions.selectNode({
        nodeId: node.itemId,
        isMultiSelect: false,
        isRangeSelect: false
      }));

      // Get public/signed URL for the file using FileSystemManager
      const FileSystemManager = (await import("@/utils/file-operations/FileSystemManager")).default;
      const fileSystemManager = FileSystemManager.getInstance();
      
      const urlResult = await fileSystemManager.getFileUrl(bucketName, node.storagePath, {
        expiresIn: 3600
      });
      
      if (!urlResult.url) {
        throw new Error("Failed to get file URL");
      }

      // Get file details for proper icon/category display
      const fileDetails = getFileDetailsByUrl(urlResult.url, node.metadata, node.itemId);
      
      // Set preview file in the format FilePreviewSheet expects
      setPreviewFile({
        url: urlResult.url,
        type: node.metadata?.mimetype || fileDetails.mimetype || '',
        details: {
          localId: node.itemId,
          filename: node.name,
          name: node.name,
          extension: node.extension,
          mimetype: node.metadata?.mimetype || fileDetails.mimetype,
          size: node.metadata?.size,
          category: fileDetails.category,
          icon: fileDetails.icon,
          color: fileDetails.color,
          canPreview: fileDetails.canPreview,
        }
      });

    } catch (error) {
      console.error('Failed to open file preview:', error);
      toast({
        title: "Error opening preview",
        description: error instanceof Error ? error.message : "Failed to open file preview",
        variant: "destructive"
      });
    }
  }, [dispatch, toast]);

  const closePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  return (
    <FilePreviewContext.Provider 
      value={{ 
        openPreview, 
        closePreview, 
        isOpen: !!previewFile 
      }}
    >
      {children}
      
      {previewFile && (
        <FilePreviewSheet
          isOpen={true}
          onClose={closePreview}
          file={previewFile}
        />
      )}
    </FilePreviewContext.Provider>
  );
}

