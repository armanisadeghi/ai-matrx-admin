'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import { Input } from '@/components/ui/input';
import TestContainer, { TestMode } from '../TestContainer';

type Result = {
  data: unknown;
  error: unknown;
};

type StorageItemTestProps = {
  onResultsChange: (cliResult: Result, sqlResult: Result) => void;
};

export default function StorageItemTest({ onResultsChange }: StorageItemTestProps) {
  const [bucketName, setBucketName] = useState('Images');
  const [directory, setDirectory] = useState('Avatars/Education');
  const [filename, setFilename] = useState('history-tutor-female-avatar.jpeg');
  const [isLoading, setIsLoading] = useState(false);

  const handleCliSearch = async () => {
    try {
      const { data, error: searchError } = await supabase
        .storage
        .from(bucketName)
        .list(directory, {
          search: filename,
          limit: 1
        });

      if (searchError) throw searchError;
      return { data: data?.[0] ?? null, error: '' };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const handleSqlSearch = async () => {
    try {
      const fullPath = directory ? `${directory}/${filename}` : filename;
      const { data, error: sqlError } = await supabase
        .rpc('get_storage_object', {
          p_bucket_id: bucketName,
          p_name: fullPath
        });

      if (sqlError) throw sqlError;
      return { data, error: '' };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const handleSubmit = async (mode: TestMode) => {
    setIsLoading(true);
    let cliResult = { data: null, error: '' };
    let sqlResult = { data: null, error: '' };

    try {
      if (mode === 'both' || mode === 'cli') {
        cliResult = await handleCliSearch();
      }
      if (mode === 'both' || mode === 'sql') {
        sqlResult = await handleSqlSearch();
      }
      onResultsChange(cliResult, sqlResult);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TestContainer 
      title="Storage Item Test"
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <Input
        placeholder="Bucket name"
        value={bucketName}
        onChange={(e) => setBucketName(e.target.value)}
        required
      />
      <Input
        placeholder="Directory path"
        value={directory}
        onChange={(e) => setDirectory(e.target.value)}
      />
      <Input
        placeholder="Filename"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        required
      />
    </TestContainer>
  );
}