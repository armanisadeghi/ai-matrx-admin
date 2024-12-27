// components/FileExplorer/FileTree.tsx
import React from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';

import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import NodeItem from './NodeItem';


export default function FileTree() {
    const { activeBucket } = useFileSystem();
    const selectors = createFileSystemSelectors(activeBucket);
    const allNodes = useAppSelector(selectors.selectAllNodes);
    const rootNodes = allNodes.filter(node => node.parentId === "root");
  
    return (
      <div className="min-h-[300px]">
        {rootNodes.length > 0 ? (
          rootNodes.map((node) => (
            <NodeItem
              key={node.itemId}
              node={node}
              level={0}
            />
          ))
        ) : (
          <div className="p-4 text-muted-foreground">
            No items found
          </div>
        )}
      </div>
    );
  }