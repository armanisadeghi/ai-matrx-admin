'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import { Input } from '@/components/ui/input';
import TestContainer, { TestMode } from '../TestContainer';
import BucketSelect from '../BucketSelect';

type PathContentsTestProps = {
  onResultsChange: (cliResult: Result, sqlResult: Result) => void;
};

export default function PathContentsTest({ onResultsChange }: PathContentsTestProps) {
  const [selectedBucket, setSelectedBucket] = useState('');
  const [path, setPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCliSearch = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from(selectedBucket)
        .list(path, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) throw error;
      return { data, error: '' };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const handleSqlSearch = async () => {
    try {
      const pathPattern = path ? `${path}/%` : '%';
      const { data, error } = await supabase
        .from('storage.objects')
        .select('*')
        .eq('bucket_id', selectedBucket)
        .like('name', pathPattern);

      if (error) throw error;
      return { data, error: '' };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const handleSubmit = async (mode: TestMode) => {
    if (!selectedBucket) {
      onResultsChange(
        { data: null, error: 'No bucket selected' },
        { data: null, error: 'No bucket selected' }
      );
      return;
    }

    setIsLoading(true);
    try {
      const cliResult = mode === 'cli' || mode === 'both' ? await handleCliSearch() : { data: null, error: '' };
      const sqlResult = mode === 'sql' || mode === 'both' ? await handleSqlSearch() : { data: null, error: '' };
      onResultsChange(cliResult, sqlResult);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TestContainer 
      title="List Path Contents"
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <BucketSelect 
        value={selectedBucket} 
        onValueChange={setSelectedBucket} 
      />
      <Input
        placeholder="Path (optional)"
        value={path}
        onChange={(e) => setPath(e.target.value)}
      />
    </TestContainer>
  );
}