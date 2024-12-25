'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataDisplay from './DataDisplay';
import FilePreview from './FilePreview';

type Result = {
  data: unknown;
  error: unknown;
};

type TestResultsProps = {
  cliResult: Result;
  sqlResult: Result;
};

function ResultSection({ title, result }: { title: string; result: Result }) {
  // Handle blob data type checking
  const hasBlob = result.data && 
    typeof result.data === 'object' && 
    result.data !== null && 
    'blob' in result.data &&
    result.data.blob instanceof Blob;

  const blob = hasBlob ? (result.data as { blob: Blob }).blob : null;
  const canPreview = blob?.type.match(/^(image\/|text\/)/);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="data">
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="preview" disabled={!canPreview}>Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="data">
            <DataDisplay data={result.data} error={result.error} />
          </TabsContent>

          <TabsContent value="preview">
            {blob && canPreview ? (
              <FilePreview data={blob} mimeType={blob.type} />
            ) : (
              <div className="text-muted-foreground text-sm p-4">
                No preview available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function TestResults({ cliResult, sqlResult }: TestResultsProps) {
  return (
    <div className="mt-6">
      <Tabs defaultValue="cli">
        <TabsList className="w-full">
          <TabsTrigger value="cli" className="flex-1">CLI Response</TabsTrigger>
          <TabsTrigger value="sql" className="flex-1">SQL Response</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cli">
          <ResultSection title="CLI Result" result={cliResult} />
        </TabsContent>
        
        <TabsContent value="sql">
          <ResultSection title="SQL Result" result={sqlResult} />
        </TabsContent>
      </Tabs>
    </div>
  );
}