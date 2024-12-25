'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TestResults from './TestResults';
import StorageItemTest from './StorageItemTest';
import BucketListTest from './BucketListTest';

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
    <div className="w-full max-w-8xl py-4 px-1">
      <Tabs defaultValue="storage-item" className="w-full">
        <TabsList>
          <TabsTrigger value="storage-item">Storage Item</TabsTrigger>
          <TabsTrigger value="bucket-list">Bucket List</TabsTrigger>
        </TabsList>

        <TabsContent value="storage-item" className="my-2">
          <StorageItemTest onResultsChange={handleResultsChange} />
        </TabsContent>

        <TabsContent value="bucket-list" className="my-2">
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