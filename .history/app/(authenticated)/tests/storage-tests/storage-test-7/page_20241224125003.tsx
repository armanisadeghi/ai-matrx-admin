'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TestResults from './TestResults';
import StorageItemTest from './tests/StorageItemTest';
import BucketListTest from '@/components/test-interface/tests/BucketListTest';

type Result = {
  data: unknown;
  error: unknown;
};

type TestResults = {
  cliResult: Result;
  sqlResult: Result;
};

export default function StorageTests() {
  const [results, setResults] = useState<TestResults>({
    cliResult: { data: null, error: '' },
    sqlResult: { data: null, error: '' }
  });

  const handleResultsChange = (cliResult: Result, sqlResult: Result) => {
    setResults({ cliResult, sqlResult });
  };

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="storage-item" className="w-full">
        <TabsList>
          <TabsTrigger value="storage-item">Storage Item</TabsTrigger>
          <TabsTrigger value="bucket-list">Bucket List</TabsTrigger>
        </TabsList>

        <TabsContent value="storage-item">
          <StorageItemTest onResultsChange={handleResultsChange} />
        </TabsContent>

        <TabsContent value="bucket-list">
          <BucketListTest onResultsChange={handleResultsChange} />
        </TabsContent>
      </Tabs>

      <TestResults 
        cliResult={results.cliResult}
        sqlResult={results.sqlResult}
      />
    </div>
  );
}