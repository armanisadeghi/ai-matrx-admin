'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const ResultSection = ({ title, result }: { title: string; result: Result }) => (
    <Card className="mt-4">
      <CardHeader >
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Data:</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-auto min-h-[100px] text-sm">
              {result.data ? JSON.stringify(result.data, null, 2) : ''}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Error:</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-auto min-h-[100px] text-sm text-destructive">
              {result.error ? JSON.stringify(result.error, null, 2) : ''}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!showCliTab && !showSqlTab) return null;

  if (!showCliTab && showSqlTab) {
    return <ResultSection title="SQL Result" result={sqlResult} />;
  }

  if (showCliTab && !showSqlTab) {
    return <ResultSection title="CLI Result" result={cliResult} />;
  }

  return (
    <Tabs defaultValue="cli" className="mt-6">
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
  );
}