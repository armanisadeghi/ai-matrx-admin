// components/FileExplorer/FileTree.tsx
import React from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { NodeItemId } from '@/lib/redux/fileSystem/types';
import NodeItem from './NodeItem';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';

export default function FileTree() {
    const dispatch = useAppDispatch();
    const { activeBucket } = useFileSystem();
    const slice = createFileSystemSlice(activeBucket);
    const selectors = createFileSystemSelectors(activeBucket);
    const { actions } = slice;
  
    // Direct selector usage
    const nodes = useAppSelector((state) => state.fileSystem[activeBucket].nodes);
    const activeNode = useAppSelector((state) => state.fileSystem[activeBucket].activeNode);
  
    const rootNodes = React.useMemo(() => {
      return Object.values(nodes)
        .filter(node => node.parentId === null)
        .sort((a, b) => {
          if (a.contentType !== b.contentType) {
            return a.contentType === "FOLDER" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
    }, [nodes]);
  
    console.log('FileTree State:', {
      nodeCount: Object.keys(nodes).length,
      rootNodes: rootNodes.map(n => ({name: n.name, id: n.itemid})),
      activeNode: activeNode ? nodes[activeNode]?.name : null
    });
  
    const handleNodeClick = async (nodeId: NodeItemId, isFolder: boolean) => {
      console.log('Node clicked:', {nodeId, isFolder});
      
      // Always set as active node first
      await dispatch(actions.selectNode({
        nodeId,
        isMultiSelect: false,
        isRangeSelect: false
      }));
  
      // Only fetch contents if it's a folder
      if (isFolder) {
        const node = nodes[nodeId];
        console.log('Fetching contents for folder:', node.name, 'path:', node.storagePath);
        await dispatch(actions.listContents({
          forceFetch: true // Force fetch to ensure we get fresh data
        }));
      }
    };
  
    return (
      <div className="min-h-[300px]">
        {rootNodes.length > 0 ? (
          rootNodes.map((node) => (
            <NodeItem
              key={node.itemid}
              node={node}
              level={0}
              isSelected={node.itemid === activeNode}
              onClick={handleNodeClick}
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
  