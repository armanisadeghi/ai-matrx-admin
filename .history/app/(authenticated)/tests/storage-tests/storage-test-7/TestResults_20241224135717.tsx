'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FilePreview from './FilePreview';

type Result = {
  data: unknown;
  error: unknown;
};

type TestResultsProps = {
  cliResult?: Result;
  sqlResult?: Result;
  showCliTab?: boolean;
  showSqlTab?: boolean;
};

export default function TestResults({ 
  cliResult = { data: null, error: '' }, 
  sqlResult = { data: null, error: '' },
  showCliTab = true,
  showSqlTab = true 
}: TestResultsProps) {
  const ResultSection = ({ title, result }: { title: string; result: Result }) => {
    const hasPreview = result.data && 'blob' in result.data && result.data.blob;
    const showPreviewTab = hasPreview && (result.data as { blob: Blob }).blob.type.match(/^(image\/|text\/)/);

    return (
      <Card className="mt-4">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {hasPreview ? (
            <Tabs defaultValue="data">
              <TabsList>
                <TabsTrigger value="data">Data</TabsTrigger>
                {showPreviewTab && <TabsTrigger value="preview">Preview</TabsTrigger>}
              </TabsList>
              <TabsContent value="data">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3 text-sm text-foreground">Data:</h3>
                    <pre className="bg-muted/50 p-4 rounded-lg overflow-auto min-h-[100px] text-sm">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-medium mb-3 text-sm text-foreground">Error:</h3>
                    <pre className="bg-muted/50 p-4 rounded-lg overflow-auto min-h-[100px] text-sm text-destructive">
                      {result.error ? JSON.stringify(result.error, null, 2) : ''}
                    </pre>
                  </div>
                </div>
              </TabsContent>
              {showPreviewTab && (
                <TabsContent value="preview">
                  <FilePreview 
                    data={(result.data as { blob: Blob }).blob}
                    mimeType={(result.data as { blob: Blob }).blob.type}
                  />
                </TabsContent>
              )}
            </Tabs>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3 text-sm text-foreground">Data:</h3>
                <pre className="bg-muted/50 p-4 rounded-lg overflow-auto min-h-[100px] text-sm">
                  {result.data ? JSON.stringify(result.data, null, 2) : ''}
                </pre>
              </div>
              <div>
                <h3 className="font-medium mb-3 text-sm text-foreground">Error:</h3>
                <pre className="bg-muted/50 p-4 rounded-lg overflow-auto min-h-[100px] text-sm text-destructive">
                  {result.error ? JSON.stringify(result.error, null, 2) : ''}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!showCliTab && !showSqlTab) return null;

  if (!showCliTab && showSqlTab) {
    return <ResultSection title="SQL Result" result={sqlResult} />;
  }

  if (showCliTab && !showSqlTab) {
    return <ResultSection title="CLI Result" result={cliResult} />;
  }

  return (
    <div className="mt-6">
      <Tabs defaultValue="cli">
        <TabsList className="w-full">
          {showCliTab && <TabsTrigger value="cli" className="flex-1">CLI Response</TabsTrigger>}
          {showSqlTab && <TabsTrigger value="sql" className="flex-1">SQL Response</TabsTrigger>}
        </TabsList>
        
        {showCliTab && (
          <TabsContent value="cli">
            <ResultSection title="CLI Result" result={cliResult} />
          </TabsContent>
        )}
        
        {showSqlTab && (
          <TabsContent value="sql">
            <ResultSection title="SQL Result" result={sqlResult} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}