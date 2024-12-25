'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const [cliResult, sqlResult] = await Promise.all([
      handleCliSearch(),
      handleSqlSearch()
    ]);

    onResultsChange(cliResult, sqlResult);
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>List Storage Buckets</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching Buckets...
              </>
            ) : (
              'List Buckets'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}