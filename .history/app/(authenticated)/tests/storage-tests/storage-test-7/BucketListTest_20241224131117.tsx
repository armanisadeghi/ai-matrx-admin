'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import TestContainer, { TestMode } from './TestContainer';

type Result = {
  data: unknown;
  error: unknown;
};

type BucketListTestProps = {
  onResultsChange: (cliResult: Result, sqlResult: Result) => void;
};

export default function BucketListTest({ onResultsChange }: BucketListTestProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCliSearch = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .listBuckets();

      if (error) throw error;
      return { data, error: '' };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const handleSqlSearch = async () => {
    try {
      const { data, error } = await supabase
        .from('storage.buckets')
        .select('*');

      if (error) throw error;
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
      title="List Storage Buckets"
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <div className="text-sm text-muted-foreground">
        Click the button below to list all storage buckets.
      </div>
    </TestContainer>
  );
}