'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import TestContainer, { TestMode } from './TestContainer';
import BucketSelect from './BucketSelect';
import FolderSelect from './FolderSelect';
import FileSelect from './FileSelect';
import { Result } from './page';

type FileDownloadTestProps = {
  onResultsChange: (cliResult: Result) => void;
};

export default function FileDownloadTest({ onResultsChange }: FileDownloadTestProps) {
  const [selectedBucket, setSelectedBucket] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (file: { name: string; id: string }) => {
    setSelectedFile(file);
  };

  const handleDownload = async () => {
    try {
      if (!selectedBucket || !selectedPath || !selectedFile) {
        throw new Error('Please select a bucket, folder, and file');
      }

      const fullPath = `${selectedPath}/${selectedFile.name}`;
      
      const { data: blob, error: downloadError } = await supabase
        .storage
        .from(selectedBucket)
        .download(fullPath);

      if (downloadError) throw downloadError;

      // Get file metadata
      const { data: metadata } = await supabase
        .storage
        .from(selectedBucket)
        .getPublicUrl(fullPath);

      return { 
        data: { 
          blob, 
          metadata,
          path: fullPath,
          mimeType: blob.type
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

    setIsLoading(true);
    try {
      const result = await handleDownload();
      onResultsChange(result);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TestContainer 
      title="Download File"
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <BucketSelect 
          value={selectedBucket} 
          onValueChange={(bucket) => {
            setSelectedBucket(bucket);
            setSelectedPath('');
            setSelectedFile(null);
          }}
        />

        {selectedBucket && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Select Folder:</p>
            <FolderSelect 
              bucketName={selectedBucket}
              onPathChange={(path) => {
                setSelectedPath(path);
                setSelectedFile(null);
              }}
            />
          </div>
        )}

        {selectedBucket && selectedPath && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Select File:</p>
            <FileSelect 
              bucketName={selectedBucket}
              path={selectedPath}
              onFileSelect={handleFileSelect}
            />
          </div>
        )}

        {selectedFile && (
          <div className="text-sm text-muted-foreground">
            Selected file: {selectedPath}/{selectedFile.name}
          </div>
        )}
      </div>
    </TestContainer>
  );
}