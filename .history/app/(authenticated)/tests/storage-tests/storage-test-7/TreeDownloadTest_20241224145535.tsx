'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import TestContainer, { TestMode } from './TestContainer';
import BucketSelect from './BucketSelect';
import StorageTree from './StorageTree';
import { Result } from './page';

type TreeDownloadTestProps = {
  onResultsChange: (cliResult: Result) => void;
};

export default function TreeDownloadTest({ onResultsChange }: TreeDownloadTestProps) {
  const [selectedBucket, setSelectedBucket] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    id: string;
    metadata?: { mimetype?: string } | null;
  } | null>(null);

  const handleFileSelect = (path: string, file: { name: string; id: string; metadata?: { mimetype?: string } | null }) => {
    setSelectedPath(path);
    setSelectedFile(file);
  };

  const handleDownload = async () => {
    try {
      if (!selectedBucket || !selectedPath || !selectedFile) {
        throw new Error('Please select a file to download');
      }

      const { data: blob, error: downloadError } = await supabase
        .storage
        .from(selectedBucket)
        .download(selectedPath);

      if (downloadError) throw downloadError;

      // Get file metadata
      const { data: metadata } = await supabase
        .storage
        .from(selectedBucket)
        .getPublicUrl(selectedPath);

      return { 
        data: { 
          blob, 
          metadata,
          path: selectedPath,
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
      title="Tree File Download"
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
            <StorageTree 
              bucketName={selectedBucket}
              onFileSelect={handleFileSelect}
            />
          </div>
        )}

        {selectedFile && (
          <div className="text-sm text-muted-foreground">
            Selected file: {selectedPath}
          </div>
        )}
      </div>
    </TestContainer>
  );
}