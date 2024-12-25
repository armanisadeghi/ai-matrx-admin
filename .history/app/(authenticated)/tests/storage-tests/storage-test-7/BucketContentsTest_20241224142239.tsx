'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import TestContainer, { TestMode } from '../TestContainer';
import BucketSelect from '../BucketSelect';

type BucketContentsTestProps = {
  onResultsChange: (cliResult: Result, sqlResult: Result) => void;
};

export default function BucketContentsTest({ onResultsChange }: BucketContentsTestProps) {
  const [selectedBucket, setSelectedBucket] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCliSearch = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from(selectedBucket)
        .list(undefined, {
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
      const { data, error } = await supabase
        .from('storage.objects')
        .select('*')
        .eq('bucket_id', selectedBucket);

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
      title="List Bucket Contents"
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <BucketSelect 
        value={selectedBucket} 
        onValueChange={setSelectedBucket} 
      />
    </TestContainer>
  );
}