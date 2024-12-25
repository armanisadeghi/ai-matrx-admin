'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TestResults from './TestResults';
import StorageItemTest from './StorageItemTest';
import BucketListTest from './BucketListTest';
import FileDownloadTest from './FileDownloadTest';

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

  const handleFileDownloadResults = (cliResult: Result) => {
    setResults({
      cliResult,
      sqlResult: { data: null, error: '' }
    });
  };

  return (
    <div className="relative w-full py-4 px-1 overflow-y-auto">
      <div className="max-w-8xl space-y-6">
        <Tabs defaultValue="storage-item" className="w-full">
          <TabsList>
            <TabsTrigger value="storage-item">Storage Item</TabsTrigger>
            <TabsTrigger value="bucket-list">Bucket List</TabsTrigger>
            <TabsTrigger value="file-download">Download File</TabsTrigger>
          </TabsList>

          <TabsContent value="storage-item" className="my-2">
            <StorageItemTest onResultsChange={handleResultsChange} />
          </TabsContent>

          <TabsContent value="bucket-list" className="my-2">
            <BucketListTest onResultsChange={handleResultsChange} />
          </TabsContent>

          <TabsContent value="file-download" className="my-2">
            <FileDownloadTest onResultsChange={handleFileDownloadResults} />
          </TabsContent>
        </Tabs>

        <TestResults
          cliResult={results.cliResult}
          sqlResult={results.sqlResult}
          showSqlTab={results.sqlResult.data !== null || results.sqlResult.error !== ''}
        />
      </div>
    </div>
  );
}