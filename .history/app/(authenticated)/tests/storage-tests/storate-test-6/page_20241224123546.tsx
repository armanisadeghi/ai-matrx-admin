'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileObject } from '@supabase/storage-js';

type SQLStorageObject = {
  id: string;
  bucket_id: string;
  name: string;
  owner: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
  path_tokens: string[];
  version: string;
  owner_id: string | null;
  user_metadata: unknown | null;
};

type Result<T> = {
  data: T | null;
  error: unknown;
};

export default function StorageExplorer() {
  const [bucketName, setBucketName] = useState('Images');
  const [directory, setDirectory] = useState('Avatars/Education');
  const [filename, setFilename] = useState('history-tutor-female-avatar.jpeg');
  const [cliResult, setCliResult] = useState<Result<FileObject>>({ data: null, error: '' });
  const [sqlResult, setSqlResult] = useState<Result<SQLStorageObject>>({ data: null, error: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleCliSearch = async () => {
    try {
      const { data, error: searchError } = await supabase
        .storage
        .from(bucketName)
        .list(directory, {
          search: filename,
          limit: 1
        });

      if (searchError) throw searchError;
      if (!data || data.length === 0) {
        throw new Error('No file found with the specified criteria');
      }

      setCliResult({ data: data[0], error: '' });
    } catch (err) {
      setCliResult({ data: null, error: err });
    }
  };

  const handleSqlSearch = async () => {
    try {
      const fullPath = directory ? `${directory}/${filename}` : filename;
      
      const { data, error: sqlError } = await supabase
        .from('storage.objects')
        .select('*')
        .eq('bucket_id', bucketName)
        .eq('name', fullPath)
        .single();

      if (sqlError) throw sqlError;
      if (!data) {
        throw new Error('No file found in SQL query');
      }

      setSqlResult({ data: data as SQLStorageObject, error: '' });
    } catch (err) {
      setSqlResult({ data: null, error: err });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCliResult({ data: null, error: '' });
    setSqlResult({ data: null, error: '' });

    await Promise.all([handleCliSearch(), handleSqlSearch()]);
    setIsLoading(false);
  };

  const ResultSection = ({ title, result }: { title: string; result: Result<unknown> }) => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Data:</h3>
          <pre className="bg-muted p-4 rounded-lg overflow-auto min-h-[100px]">
            {result.data ? JSON.stringify(result.data, null, 2) : ''}
          </pre>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Error:</h3>
          <pre className="bg-muted p-4 rounded-lg overflow-auto min-h-[100px] text-destructive">
            {result.error ? JSON.stringify(result.error, null, 2) : ''}
          </pre>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Explorer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <Input
              placeholder="Bucket name"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              required
            />
            <Input
              placeholder="Directory path"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
            />
            <Input
              placeholder="Filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              required
            />
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

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