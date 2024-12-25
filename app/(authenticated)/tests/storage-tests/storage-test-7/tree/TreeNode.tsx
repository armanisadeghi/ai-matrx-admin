// components/TreeNode.tsx
'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStorageList } from './useStorageList';
import { TreeItem, TreeNodeProps } from './types';
import { formatSize } from './utils';

export function TreeNode({ item, path, bucketName, onFileSelect, level = 0 }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fullPath = path ? `${path}/${item.name}` : item.name;
  
  const { items: children, loading, error } = useStorageList(
    bucketName,
    isOpen && item.type === 'folder' ? fullPath : ''
  );

  const handleClick = () => {
    console.log('TreeNode - handleClick called for:', item);
    if (item.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      console.log('TreeNode - Calling onFileSelect with:', { fullPath, item });
      onFileSelect(fullPath, item);
    }
  };
  

  const paddingLeft = `${level * 1.25}rem`;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-8 px-2 hover:bg-accent hover:text-accent-foreground"
        onClick={handleClick}
        style={{ paddingLeft }}
      >
        <div className="flex items-center min-w-0 w-full">
          <div className="flex items-center flex-none">
            {item.type === 'folder' && (
              <div className="w-4 h-4 mr-1">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            )}
            {item.type === 'folder' ? (
              <Folder className="h-4 w-4 mr-2" />
            ) : (
              <File className="h-4 w-4 mr-2" />
            )}
          </div>
          <span className="truncate flex-1 text-left">
            {item.name}
          </span>
          {item.type === 'file' && item.metadata?.size && (
            <span className="text-xs text-muted-foreground ml-2 flex-none">
              {formatSize(item.metadata.size)}
            </span>
          )}
        </div>
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
