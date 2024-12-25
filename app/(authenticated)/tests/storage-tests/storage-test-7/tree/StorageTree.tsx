'use client';

import { ScrollArea } from "@/components/ui/scroll-area";
import { useStorageList } from './useStorageList';
import { TreeNode } from './TreeNode';
import { TreeItem, FileSelectHandler } from './types';

type StorageTreeProps = {
  bucketName: string;
  onFileSelect: FileSelectHandler;
};

export default function StorageTree({ bucketName, onFileSelect }: StorageTreeProps) {
  const { items, loading, error } = useStorageList(bucketName);

  if (!bucketName) {
    return <div className="text-sm text-muted-foreground">Select a bucket to view contents</div>;
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <div className="p-2">
        {items.map(item => (
          <TreeNode
            key={item.name}
            item={item}
            path=""
            bucketName={bucketName}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
