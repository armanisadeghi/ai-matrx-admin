// components/FileExplorer/FileTree.tsx
import React from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { cn } from '@/lib/utils';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import NodeItem from './NodeItem';
import { EmptySidebar } from '@/components/matrx/LoadingComponents';

interface FileTreeProps {
  className?: string;
}

export default function FileTree({ className }: FileTreeProps) {
    const { activeBucket } = useFileSystem();
    const selectors = createFileSystemSelectors(activeBucket);
    const allNodes = useAppSelector(selectors.selectAllNodes);
    const rootNodes = allNodes.filter(node => node.parentId === "root");
  
    return (
      <div className={cn("flex-1 flex flex-col p-0 overflow-y-auto", className)}>
        {rootNodes.length > 0 ? (
          rootNodes.map((node) => (
            <NodeItem
              key={node.itemId}
              node={node}
              level={0}
            />
          ))
        ) : (
          <EmptySidebar />
        )}
      </div>
    );
  }