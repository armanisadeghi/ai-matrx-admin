'use client';

type DataDisplayProps = {
  data: unknown;
  error: unknown;
};

export default function DataDisplay({ data, error }: DataDisplayProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-3 text-sm text-foreground">Data:</h3>
        <pre className="bg-muted/50 p-4 rounded-lg overflow-auto min-h-[100px] text-sm">
          {data ? JSON.stringify(data, null, 2) : ''}
        </pre>
      </div>
      <div>
        <h3 className="font-medium mb-3 text-sm text-foreground">Error:</h3>
        <pre className="bg-muted/50 p-4 rounded-lg overflow-auto min-h-[100px] text-sm text-destructive">
          {error ? JSON.stringify(error, null, 2) : ''}
        </pre>
      </div>
    </div>
  );
}