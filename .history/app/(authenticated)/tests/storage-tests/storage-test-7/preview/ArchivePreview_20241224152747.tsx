// components/previews/ArchivePreview.tsx
'use client';

import { FileText } from 'lucide-react';

type ArchiveEntry = {
  name: string;
  size: number;
};

export default function ArchivePreview({ entries }: { entries: ArchiveEntry[] }) {
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

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="border rounded-lg divide-y">
        {entries.map((entry, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 text-sm hover:bg-accent/50"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatSize(entry.size)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}