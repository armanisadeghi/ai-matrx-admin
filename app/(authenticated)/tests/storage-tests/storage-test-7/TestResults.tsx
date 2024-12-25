'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataDisplay from './DataDisplay';
import FilePreview from './preview/FilePreview';

type Result = {
  data: unknown;
  error: unknown;
};

type TestResultsProps = {
  cliResult: Result;
  sqlResult: Result;
};

function ResultTabs({ cliResult, sqlResult }: TestResultsProps) {
  return (
    <Tabs defaultValue="cli">
      <TabsList className="w-full">
        <TabsTrigger value="cli" className="flex-1">CLI Response</TabsTrigger>
        <TabsTrigger value="sql" className="flex-1">SQL Response</TabsTrigger>
      </TabsList>
      
      <TabsContent value="cli">
        <Card className="mt-4">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg font-semibold">CLI Result</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <DataDisplay data={cliResult.data} error={cliResult.error} />
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="sql">
        <Card className="mt-4">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg font-semibold">SQL Result</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <DataDisplay data={sqlResult.data} error={sqlResult.error} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default function TestResults({ cliResult, sqlResult }: TestResultsProps) {
  const hasPreviewData = cliResult.data && 
    typeof cliResult.data === 'object' && 
    cliResult.data !== null && 
    'blob' in cliResult.data;

  const previewBlob = hasPreviewData ? (cliResult.data as { blob: Blob }).blob : null;
  const previewMimeType = previewBlob?.type ?? '';

  return (
    <div className="mt-6">
      <Tabs defaultValue="data">
        <TabsList className="w-full">
          <TabsTrigger value="data" className="flex-1">Data</TabsTrigger>
          <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="data">
          <ResultTabs cliResult={cliResult} sqlResult={sqlResult} />
        </TabsContent>
        
        <TabsContent value="preview">
          <Card className="mt-4">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg font-semibold">File Preview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <FilePreview data={previewBlob} mimeType={previewMimeType} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}