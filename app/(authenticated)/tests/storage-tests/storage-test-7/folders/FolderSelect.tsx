'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/utils/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Folder } from "lucide-react";

type FolderSelectProps = {
  bucketName: string;
  onPathChange: (path: string) => void;
};

export default function FolderSelect({ bucketName, onPathChange }: FolderSelectProps) {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchFolders() {
      if (!bucketName) {
        setFolders([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .storage
          .from(bucketName)
          .list();

        if (error) throw error;

        const folderList = data
          .filter(item => item.id === null)
          .map(item => item.name)
          .sort();

        setFolders(folderList);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch folders');
        setFolders([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFolders();
  }, [bucketName]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading folders...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (!bucketName) {
    return <div className="text-sm text-muted-foreground">Select a bucket to view folders</div>;
  }

  if (folders.length === 0) {
    return <div className="text-sm text-muted-foreground">No folders found</div>;
  }

  return (
    <ScrollArea className="h-32 rounded-md border">
      <div className="p-2 space-y-1">
        {folders.map((folder) => (
          <Button
            key={folder}
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => onPathChange(folder)}
          >
            <Folder className="h-4 w-4 mr-2" />
            {folder}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}