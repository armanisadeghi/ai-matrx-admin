'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/utils/supabase/client";
import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type TreeItem = {
  name: string;
  id: string | null;
  type: 'file' | 'folder';
  metadata?: {
    size: number;
    mimetype: string;
  } | null;
};

type TreeNodeProps = {
  item: TreeItem;
  path: string;
  bucketName: string;
  onFileSelect: (path: string, file: TreeItem) => void;
  level?: number;
};

function TreeNode({ item, path, bucketName, onFileSelect, level = 0 }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fullPath = path ? `${path}/${item.name}` : item.name;

  useEffect(() => {
    if (isOpen && item.type === 'folder') {
      loadChildren();
    }
  }, [isOpen]);

  const loadChildren = async () => {
    if (!bucketName) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .list(fullPath);

      if (error) throw error;

      const items = data.map(item => ({
        name: item.name,
        id: item.id,
        type: item.id === null ? 'folder' : 'file',
        metadata: item.metadata
      })) as TreeItem[];

      setChildren(items.sort((a, b) => {
        // Folders first, then files
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contents');
    } finally {
      setLoading(false);
    }
  };

  function formatSize(bytes: number | undefined): string {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(fullPath, item);
    }
  };

  const paddingLeft = `${level * 1.25}rem`;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start ${item.type === 'file' ? 'text-muted-foreground' : ''}`}
        onClick={handleClick}
        style={{ paddingLeft }}
      >
        {item.type === 'folder' ? (
          isOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />
        ) : null}
        {item.type === 'folder' ? (
          <Folder className="h-4 w-4 mr-2" />
        ) : (
          <File className="h-4 w-4 mr-2" />
        )}
        <span className="truncate flex-1">{item.name}</span>
        {item.type === 'file' && item.metadata?.size && (
          <span className="text-xs text-muted-foreground ml-2">
            {formatSize(item.metadata.size)}
          </span>
        )}
      </Button>

      {isOpen && item.type === 'folder' && (
        <div className="relative">
          {loading ? (
            <div className="text-xs text-muted-foreground py-1" style={{ paddingLeft: `${(level + 1) * 1.25}rem` }}>
              Loading...
            </div>
          ) : error ? (
            <div className="text-xs text-destructive py-1" style={{ paddingLeft: `${(level + 1) * 1.25}rem` }}>
              {error}
            </div>
          ) : (
            children.map(child => (
              <TreeNode
                key={child.name}
                item={child}
                path={fullPath}
                bucketName={bucketName}
                onFileSelect={onFileSelect}
                level={level + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

type StorageTreeProps = {
  bucketName: string;
  onFileSelect: (path: string, file: TreeItem) => void;
};

export default function StorageTree({ bucketName, onFileSelect }: StorageTreeProps) {
  const [rootItems, setRootItems] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bucketName) {
      setRootItems([]);
      return;
    }

    async function loadRoot() {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .storage
            .from(bucketName)
            .list();
      
          if (error) throw error;
      
          const items: TreeItem[] = data.map(item => ({
            name: item.name,
            id: item.id,
            type: item.id === null ? 'folder' : 'file' as const,
            metadata: item.metadata
          }));
      
          setRootItems(items.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
          }));
        } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to load contents');
      } finally {
        setLoading(false);
      }
    }

    loadRoot();
  }, [bucketName]);

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
        {rootItems.map(item => (
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