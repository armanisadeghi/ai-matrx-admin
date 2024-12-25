"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

type StorageResponse = {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
  };
};

type SQLResponse = StorageResponse & {
  bucket_id: string;
  owner: string | null;
  path_tokens: string[];
  version: string;
  owner_id: string | null;
  user_metadata: unknown | null;
};

export default function StorageExplorer() {
    const [bucketName, setBucketName] = useState('Images');
    const [directory, setDirectory] = useState('Avatars/Education');
    const [filename, setFilename] = useState('');
    const [cliResult, setCliResult] = useState<StorageResponse | null>(null);
    const [sqlResult, setSqlResult] = useState<SQLResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
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
    
          setCliResult(data[0] as StorageResponse);
        } catch (err) {
          throw err;
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
            .limit(1);
    
          if (sqlError) throw sqlError;
          if (!data || data.length === 0) {
            throw new Error('No file found in SQL query');
          }
    
          setSqlResult(data[0] as SQLResponse);
        } catch (err) {
          throw err;
        }
      };
    
      const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setCliResult(null);
        setSqlResult(null);
    
        try {
          await Promise.all([handleCliSearch(), handleSqlSearch()]);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred while searching');
        } finally {
          setIsLoading(false);
        }
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
    
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
    
          {(cliResult || sqlResult) && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="cli">
                  <TabsList className="w-full">
                    <TabsTrigger value="cli" className="flex-1">CLI Response</TabsTrigger>
                    <TabsTrigger value="sql" className="flex-1">SQL Response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="cli" className="mt-4">
                    {cliResult && (
                      <pre className="bg-muted p-4 rounded-lg overflow-auto">
                        {JSON.stringify(cliResult, null, 2)}
                      </pre>
                    )}
                  </TabsContent>
                  <TabsContent value="sql" className="mt-4">
                    {sqlResult && (
                      <pre className="bg-muted p-4 rounded-lg overflow-auto">
                        {JSON.stringify(sqlResult, null, 2)}
                      </pre>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }
    