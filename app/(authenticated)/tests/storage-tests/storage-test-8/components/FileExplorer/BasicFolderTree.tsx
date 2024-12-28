// components/FileExplorer/BasicFolderTree.tsx
import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { FileSystemNode } from "@/lib/redux/fileSystem/types";
import { ChevronRight, ChevronDown, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderNodeProps {
  node: FileSystemNode;
  level: number;
}

interface BasicFolderTreeProps {
  onInitialNodeLoad?: (node: FileSystemNode | null) => void;
  onFolderSelect?: (node: FileSystemNode) => void;
}

function FolderNode({ node, level }: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasBeenClicked, setHasBeenClicked] = useState(false);
  
  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  const slice = createFileSystemSlice(activeBucket);
  const selectors = createFileSystemSelectors(activeBucket);
  const { actions } = slice;
  const activeNode = useAppSelector(selectors.selectActiveNode);
  const childNodes = useAppSelector(selectors.selectNodeChildren(node.itemId));
  const folderChildNodes = childNodes.filter(child => child.contentType === "FOLDER");

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    dispatch(
      actions.selectNode({
        nodeId: node.itemId,
        isMultiSelect: false,
        isRangeSelect: false,
      })
    );

    setIsExpanded(!isExpanded);
    setHasBeenClicked(true);
    
    await dispatch(
      actions.listContents({
        forceFetch: false,
      })
    );
  };

  const isSelected = activeNode?.itemId === node.itemId;
  const showChevron = !hasBeenClicked || folderChildNodes.length > 0;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center py-1 px-2 hover:bg-accent rounded-sm cursor-pointer",
          isSelected && "bg-accent",
          `ml-${level * 4}`
        )}
        onClick={handleClick}
      >
        <span className="h-4 w-4">
          {showChevron && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          )}
        </span>
        <Folder className="h-4 w-4 text-blue-500 mx-2" />
        <span>{node.name}</span>
      </div>
      {isExpanded && (
        <div className="ml-4">
          {folderChildNodes.map((childNode) => (
            <FolderNode
              key={childNode.itemId}
              node={childNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BasicFolderTree({ onInitialNodeLoad, onFolderSelect }: BasicFolderTreeProps) {
  const { activeBucket } = useFileSystem();
  const selectors = createFileSystemSelectors(activeBucket);
  const allNodes = useAppSelector(selectors.selectAllNodes);
  const activeNode = useAppSelector(selectors.selectActiveNode);
  const [initialActiveNode, setInitialActiveNode] = useState<FileSystemNode | null>(null);

  useEffect(() => {
    if (!initialActiveNode && activeNode) {
      setInitialActiveNode(activeNode);
      onInitialNodeLoad?.(activeNode);
    }
  }, [activeNode, initialActiveNode, onInitialNodeLoad]);

  useEffect(() => {
    if (activeNode && activeNode.contentType === "FOLDER") {
      onFolderSelect?.(activeNode);
    }
  }, [activeNode, onFolderSelect]);

  const rootNodes = allNodes.filter(node => 
    node.parentId === "root" && node.contentType === "FOLDER"
  );

  return (
    <div className="min-h-[300px]">
      {rootNodes.length > 0 ? (
        rootNodes.map((node) => (
          <FolderNode
            key={node.itemId}
            node={node}
            level={0}
          />
        ))
      ) : (
        <div className="p-4 text-muted-foreground">
          No folders found
        </div>
      )}
    </div>
  );
}