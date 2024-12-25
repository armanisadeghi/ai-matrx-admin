// TreeDownloadTest.tsx
'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import TreeTestContainer, { TestMode } from './TreeTestContainer';
import { Result } from '../page';
import StorageNavigator from './StorageNavigator';
import { TreeItem } from './types';

type TreeDownloadTestProps = {
  onResultsChange: (cliResult: Result) => void;
};

export default function TreeDownloadTest({ onResultsChange }: TreeDownloadTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<TreeItem | null>(null);
  const [selectedBucket, setSelectedBucket] = useState('');

  const handleFileSelect = async (bucketName: string, path: string, file: TreeItem) => {
    setSelectedBucket(bucketName);
    setSelectedPath(path);
    setSelectedFile(file);
    
    setIsLoading(true);
    try {
      const result = await handleDownload(bucketName, path, file);
      onResultsChange(result);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (bucketName: string, path: string, file: TreeItem) => {
    try {
      if (!bucketName || !path || !file) {
        throw new Error('Please select a file to download');
      }
      
      const { data: blob, error: downloadError } = await supabase
        .storage
        .from(bucketName)
        .download(path);

      if (downloadError) throw downloadError;

      const { data: metadata } = await supabase
        .storage
        .from(bucketName)
        .getPublicUrl(path);

      return { 
        data: { 
          blob, 
          metadata,
          path,
          mimeType: file.metadata?.mimetype || blob.type
        }, 
        error: '' 
      };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const handleSubmit = async (mode: TestMode) => {
    if (mode === 'sql') {
      onResultsChange({ 
        data: null, 
        error: 'SQL operations not supported for file downloads' 
      });
      return;
    }

    if (!selectedBucket || !selectedPath || !selectedFile) {
      onResultsChange({ 
        data: null, 
        error: 'Please select a file first' 
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await handleDownload(selectedBucket, selectedPath, selectedFile);
      onResultsChange(result);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TreeTestContainer 
      title="Tree File Download"
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <div className="w-full max-w-xl mx-auto">
        <StorageNavigator onFileSelect={handleFileSelect} />
        
        {selectedFile && (
          <div className="mt-4 text-sm text-muted-foreground">
            Selected: {selectedPath}
          </div>
        )}
      </div>
    </TreeTestContainer>
  );
}