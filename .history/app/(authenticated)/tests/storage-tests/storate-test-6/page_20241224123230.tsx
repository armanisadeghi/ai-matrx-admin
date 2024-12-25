'use client';

import { useState } from 'react';
import { supabase } from "@/utils/supabase/client";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export default function StorageExplorer() {
  const [bucketName, setBucketName] = useState('Images');
  const [directory, setDirectory] = useState('Avatars/Education');
  const [filename, setFilename] = useState('history-tutor-female-avatar.jpeg');
  const [cliResult, setCliResult] = useState<FileObject | null>(null);
  const [sqlResult, setSqlResult] = useState<SQLStorageObject | null>(null);
  const [cliError, setCliError] = useState<string | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCliSearch = async () => {
    setCliError(null);
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

      setCliResult(data[0]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error in CLI search';
      setCliError(errorMessage);
      throw err;
    }
  };

  const handleSqlSearch = async () => {
    setSqlError(null);
    try {
      const fullPath = directory ? `${directory}/${filename}` : filename;
      const query = `
        SELECT *
        FROM storage.objects
        WHERE bucket_id = '${bucketName}'
          AND name = '${fullPath}'
      `;

      const { data, error: sqlError } = await supabase
        .from('_tables')  // Using a direct SQL query
        .rpc('query_raw', { query })
        .throwOnError();

      if (sqlError) throw sqlError;
      if (!data || data.length === 0) {
        throw new Error('No file found in SQL query');
      }

      setSqlResult(data[0] as SQLStorageObject);
    } catch (err) {
      const errorDetails = err instanceof Error ? 
        `${err.message} ${err.cause ? `(Cause: ${JSON.stringify(err.cause)})` : ''}` : 
        'Unknown error in SQL search';
      setSqlError(errorDetails);
      console.error('SQL Error Details:', {
        error: err,
        errorType: typeof err,
        errorString: String(err),
        errorJSON: JSON.stringify(err)
      });
      throw err;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCliError(null);
    setSqlError(null);
    setCliResult(null);
    setSqlResult(null);

    const results = await Promise.allSettled([
      handleCliSearch().catch(err => err),
      handleSqlSearch().catch(err => err)
    ]);

    setIsLoading(false);

    // Log detailed results for debugging
    console.log('Search Results:', results.map(r => ({
      status: r.status,
      value: r.status === 'fulfilled' ? r.value : r.reason
    })));
  };

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
        
        <TabsContent value="cli" className="mt-4">
          {cliError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{cliError}</AlertDescription>
            </Alert>
          )}
          {cliResult && (
            <Card>
              <CardContent className="pt-6">
                <pre className="bg-muted p-4 rounded-lg overflow-auto">
                  {JSON.stringify(cliResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="sql" className="mt-4">
          {sqlError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{sqlError}</AlertDescription>
            </Alert>
          )}
          {sqlResult && (
            <Card>
              <CardContent className="pt-6">
                <pre className="bg-muted p-4 rounded-lg overflow-auto">
                  {JSON.stringify(sqlResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}