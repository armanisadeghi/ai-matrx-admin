'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import TreeTestContainer from './TreeTestContainer';
import BucketSelect from '../BucketSelect';
import StorageTree from '../StorageTree';
import { Card } from '@/components/ui/card';

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
    <TreeTestContainer 
      title="Tree File Download"
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <div className="w-64 flex-none">
        <BucketSelect 
          value={selectedBucket} 
          onValueChange={(bucket) => {
            setSelectedBucket(bucket);
            setSelectedPath('');
            setSelectedFile(null);
          }}
        />
        {selectedFile && (
          <div className="mt-4 text-sm text-muted-foreground">
            Selected: {selectedPath}
          </div>
        )}
      </div>
      
      <Card className="flex-1">
        <StorageTree 
          bucketName={selectedBucket}
          onFileSelect={handleFileSelect}
        />
      </Card>
    </TreeTestContainer>
  );
}