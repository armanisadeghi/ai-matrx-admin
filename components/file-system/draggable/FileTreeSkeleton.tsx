// FileTreeSkeleton.tsx
'use client';

import React from 'react';
import { ChevronRight, Folder, File } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FileTreeSkeletonProps {
  rows?: number;
}

export function FileTreeSkeleton({ rows = 8 }: FileTreeSkeletonProps) {
  const generateTreeStructure = () => {
    // Fixed widths to avoid hydration errors (no Math.random())
    const widths = ['85%', '65%', '95%', '70%', '90%', '75%', '80%', '88%', '72%', '92%'];
    
    const items = [];
    
    // Root folders (collapsed)
    items.push({ level: 0, isFolder: true, expanded: false, width: widths[0] });
    items.push({ level: 0, isFolder: true, expanded: true, width: widths[1] });
    // Nested items for expanded folder
    items.push({ level: 1, isFolder: true, expanded: false, width: widths[2] });
    items.push({ level: 1, isFolder: false, expanded: false, width: widths[3] });
    items.push({ level: 1, isFolder: false, expanded: false, width: widths[4] });
    items.push({ level: 0, isFolder: false, expanded: false, width: widths[5] });
    items.push({ level: 0, isFolder: true, expanded: false, width: widths[6] });
    items.push({ level: 0, isFolder: false, expanded: false, width: widths[7] });
    items.push({ level: 0, isFolder: true, expanded: false, width: widths[8] });
    items.push({ level: 0, isFolder: false, expanded: false, width: widths[9] });
    
    return items.slice(0, rows);
  };

  const items = generateTreeStructure();

  return (
    <div className="w-full animate-pulse py-0.5">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center py-0.5 px-1 text-xs"
          style={{ paddingLeft: `${item.level * 12 + 4}px` }}
        >
          {/* Chevron or spacer */}
          {item.isFolder ? (
            <div className="h-3.5 w-3.5 flex items-center justify-center flex-shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
            </div>
          ) : (
            <div className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          
          {/* Icon */}
          {item.isFolder ? (
            <Folder className="h-3.5 w-3.5 text-blue-500/30 mx-1 flex-shrink-0" />
          ) : (
            <File className="h-3.5 w-3.5 text-gray-500/30 mx-1 flex-shrink-0" />
          )}
          
          {/* Skeleton for text */}
          <Skeleton 
            className="h-3 flex-1 max-w-[160px]"
            style={{ width: item.width }} 
          />
        </div>
      ))}
    </div>
  );
}

export function FileTreeSkeletonWithHeader() {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      
      {/* Divider */}
      <div className="h-px bg-border" />
      
      {/* Tree skeleton */}
      <FileTreeSkeleton rows={10} />
    </div>
  );
}

