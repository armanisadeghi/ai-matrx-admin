// components/FileExplorer/NodeItem.tsx
import React from 'react';
import { FileSystemNode, NodeItemId } from '@/lib/redux/fileSystem/types';
import { useAppSelector } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NodeItemProps {
    node: FileSystemNode;
    level: number;
    isSelected: boolean;
    onClick: (nodeId: NodeItemId, isFolder: boolean) => void;
  }
  
  export default function NodeItem({ node, level, isSelected, onClick }: NodeItemProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const { activeBucket } = useFileSystem();
    
    const nodes = useAppSelector((state) => state.fileSystem[activeBucket].nodes);
    
    const childNodes = React.useMemo(() => {
      return Object.values(nodes)
        .filter(n => n.parentId === node.itemid)
        .sort((a, b) => {
          if (a.contentType !== b.contentType) {
            return a.contentType === "FOLDER" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
    }, [nodes, node.itemid]);
  
    const isFolder = node.contentType === 'FOLDER';
  
    console.log('NodeItem:', {
      name: node.name,
      id: node.itemid,
      isFolder,
      storagePath: node.storagePath,
      childCount: childNodes.length,
      children: childNodes.map(n => n.name)
    });
  
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick(node.itemid, isFolder);
    };
  
    const handleExpandClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Only expand if we successfully fetch
      onClick(node.itemid, isFolder).then(() => {
        setIsExpanded(!isExpanded);
      });
    };
  
    return (
      <div className="select-none">
        <div
          className={cn(
            'flex items-center py-1 px-2 hover:bg-accent rounded-sm cursor-pointer',
            isSelected && 'bg-accent',
            `ml-${level * 4}`
          )}
          onClick={handleClick}
        >
          {isFolder && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={handleExpandClick}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          {isFolder ? (
            <Folder className="h-4 w-4 text-blue-500 mx-2" />
          ) : (
            <File className="h-4 w-4 text-gray-500 mx-2" />
          )}
          <span className="text-sm">{node.name}</span>
        </div>
        {isFolder && isExpanded && (
          <div className="ml-4">
            {childNodes.map((childNode) => (
              <NodeItem
                key={childNode.itemid}
                node={childNode}
                level={level + 1}
                isSelected={false}
                onClick={onClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  