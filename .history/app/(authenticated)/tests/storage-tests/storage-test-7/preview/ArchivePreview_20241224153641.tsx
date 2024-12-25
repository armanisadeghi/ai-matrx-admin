// components/previews/ArchivePreview.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileText, Folder } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { getZipContents, type ZipEntry } from '@/utils/zipUtils';

type ArchivePreviewProps = {
  data: Blob;
};

export default function ArchivePreview({ data }: ArchivePreviewProps) {
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadZipContents() {
      try {
        const contents = await getZipContents(data);
        setEntries(contents);
      } catch (err) {
        setError('Failed to load archive contents');
      }
    }

    loadZipContents();
  }, [data]);

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

  if (error) {
    return (
      <div className="text-destructive p-4">
        {error}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border">
      <div className="p-2 space-y-0.5">
        {entries.map((entry, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 text-sm hover:bg-accent/50 rounded-sm"
            style={{ paddingLeft: `${(entry.path.split('/').length - 1) * 1.25}rem` }}
          >
            {entry.isDirectory ? (
              <Folder className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="flex-1 truncate">{entry.name}</span>
            {!entry.isDirectory && (
              <span className="text-xs text-muted-foreground">
                {formatSize(entry.size)}
              </span>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}