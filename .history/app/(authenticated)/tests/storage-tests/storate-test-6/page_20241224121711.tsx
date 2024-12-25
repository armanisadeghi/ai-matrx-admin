'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

type StorageObject = {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
};

export default function StorageExplorer() {
  const [bucketName, setBucketName] = useState('');
  const [directory, setDirectory] = useState('');
  const [filename, setFilename] = useState('');
  const [result, setResult] = useState<StorageObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const fullPath = directory ? `${directory}/${filename}` : filename;
      const { data, error: searchError } = await supabase
        .storage
        .from(bucketName)
        .list(directory, {
          search: filename,
          limit: 1
        });

      if (searchError) throw searchError;

      if (!data || data.length === 0) {
        setError('No file found with the specified criteria');
        return;
      }

      setResult(data[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Explorer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Bucket name (e.g., Images)"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Directory path (e.g., Avatars/Education)"
                value={directory}
                onChange={(e) => setDirectory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Filename (e.g., avatar.jpeg)"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                required
              />
            </div>
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

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>File Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}