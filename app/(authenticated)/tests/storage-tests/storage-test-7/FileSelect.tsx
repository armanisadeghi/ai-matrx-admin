'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/utils/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileIcon } from "lucide-react";

type FileItem = {
  name: string;
  id: string;
  metadata: {
    size: number;
    mimetype: string;
  } | null;
};

type FileSelectProps = {
  bucketName: string;
  path: string;
  onFileSelect: (file: FileItem) => void;
};

export default function FileSelect({ bucketName, path, onFileSelect }: FileSelectProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchFiles() {
      if (!bucketName || !path) {
        setFiles([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .storage
          .from(bucketName)
          .list(path);

        if (error) throw error;

        const fileList = data
          .filter(item => item.id !== null)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(item => ({
            name: item.name,
            id: item.id,
            metadata: item.metadata ? {
              size: item.metadata.size,
              mimetype: item.metadata.mimetype
            } : null
          }));

        setFiles(fileList);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch files');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, [bucketName, path]);

  function formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading files...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (!bucketName || !path) {
    return <div className="text-sm text-muted-foreground">Select a bucket and folder to view files</div>;
  }

  if (files.length === 0) {
    return <div className="text-sm text-muted-foreground">No files found</div>;
  }

  return (
    <ScrollArea className="h-40 rounded-md border">
      <div className="p-2 space-y-1">
        {files.map((file) => (
          <Button
            key={file.id}
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => onFileSelect(file)}
          >
            <FileIcon className="h-4 w-4 mr-2" />
            <span className="flex-1 truncate text-left">{file.name}</span>
            {file.metadata?.size && (
              <span className="text-xs text-muted-foreground ml-2">
                {formatSize(file.metadata.size)}
              </span>
            )}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}