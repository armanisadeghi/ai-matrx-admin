'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TestResults from './TestResults';
import StorageItemTest from './StorageItemTest';
import BucketListTest from './BucketListTest';
import FileDownloadTest from './FileDownloadTest';
import BucketContentsTest from './BucketContentsTest';
import PathContentsTest from './PathContentsTest';

export type Result = {
  data: unknown;
  error: unknown;
};

export default function StorageTests() {
  const [results, setResults] = useState<{
    cliResult: Result;
    sqlResult: Result;
  }>({
    cliResult: { data: null, error: '' },
    sqlResult: { data: null, error: '' }
  });

  const handleResultsChange = (cliResult: Result, sqlResult: Result) => {
    setResults({ cliResult, sqlResult });
  };

  return (
    <div className="relative w-full py-4 px-1 overflow-y-auto">
      <div className="max-w-8xl space-y-6">
        <Tabs defaultValue="storage-item" className="w-full">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="storage-item">Storage Item</TabsTrigger>
            <TabsTrigger value="bucket-list">Bucket List</TabsTrigger>
            <TabsTrigger value="bucket-contents">Bucket Contents</TabsTrigger>
            <TabsTrigger value="path-contents">Path Contents</TabsTrigger>
            <TabsTrigger value="file-download">Download File</TabsTrigger>
          </TabsList>

          <TabsContent value="storage-item" className="my-2">
            <StorageItemTest onResultsChange={handleResultsChange} />
          </TabsContent>

          <TabsContent value="bucket-list" className="my-2">
            <BucketListTest onResultsChange={handleResultsChange} />
          </TabsContent>

          <TabsContent value="bucket-contents" className="my-2">
            <BucketContentsTest onResultsChange={handleResultsChange} />
          </TabsContent>

          <TabsContent value="path-contents" className="my-2">
            <PathContentsTest onResultsChange={handleResultsChange} />
          </TabsContent>

          <TabsContent value="file-download" className="my-2">
            <FileDownloadTest 
              onResultsChange={(cliResult) => 
                handleResultsChange(cliResult, { data: null, error: '' })
              } 
            />
          </TabsContent>
          
        </Tabs>

        <TestResults
          cliResult={results.cliResult}
          sqlResult={results.sqlResult}
        />
      </div>
    </div>
  );
}