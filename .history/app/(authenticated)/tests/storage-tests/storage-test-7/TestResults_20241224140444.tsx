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
  const hasPreview = result.data && typeof result.data === 'object' && result.data !== null && 'blob' in result.data;
  const previewBlob = hasPreview ? (result.data as { blob: Blob }).blob : null;
  const showPreviewTab = previewBlob?.type.match(/^(image\/|text\/)/);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="data">
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            {showPreviewTab && <TabsTrigger value="preview">Preview</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="data">
            <DataDisplay data={result.data} error={result.error} />
          </TabsContent>

          {showPreviewTab && previewBlob && (
            <TabsContent value="preview">
              <FilePreview 
                data={previewBlob}
                mimeType={previewBlob.type}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function TestResults({ 
  cliResult = { data: null, error: '' }, 
  sqlResult = { data: null, error: '' }
}: TestResultsProps) {
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