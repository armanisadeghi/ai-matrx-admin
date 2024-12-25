'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import { Input } from '@/components/ui/input';
import TestContainer from './TestContainer';

type FileDownloadTestProps = {
  onResultsChange: (cliResult: {
    data: { blob?: Blob; metadata?: unknown } | null;
    error: unknown;
  }) => void;
};

export default function FileDownloadTest({ onResultsChange }: FileDownloadTestProps) {
  const [bucketName, setBucketName] = useState('Images');
  const [filePath, setFilePath] = useState('Avatars/Education/history-tutor-female-avatar.jpeg');
  const [isLoading, setIsLoading] = useState(false);

  const handleCliDownload = async () => {
    try {
      const { data: blob, error } = await supabase
        .storage
        .from(bucketName)
        .download(filePath);

      if (error) throw error;

      // Get file metadata
      const { data: metadata } = await supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return { 
        data: { 
          blob, 
          metadata,
          mimeType: blob.type
        }, 
        error: '' 
      };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const cliResult = await handleCliDownload();
      onResultsChange(cliResult);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TestContainer 
      title="Download File"
      isLoading={isLoading}
      onSubmit={async (mode) => {
        if (mode === 'sql') {
          onResultsChange({ data: null, error: 'SQL operations not supported for file downloads' });
          return;
        }
        await handleSubmit();
      }}
    >
      <Input
        placeholder="Bucket name"
        value={bucketName}
        onChange={(e) => setBucketName(e.target.value)}
        required
      />
      <Input
        placeholder="File path"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
        required
      />
    </TestContainer>
  );
}