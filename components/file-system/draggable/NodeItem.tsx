// NodeItem.tsx
import React, { useState, useCallback } from 'react';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { ChevronRight, ChevronDown, MoreVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileNameEditor } from '../tree/FileNameEditor';
import { SelectionRange } from '../types';
import { DraggableNode } from './DraggableNode';
import { DroppableFolder } from './DroppableFolder';
import { FileContextMenu } from '../context-menu/FileContextMenu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getFileDetailsByExtension, getFolderDetails } from '@/utils/file-operations';

interface NodeItemProps {
  node: FileSystemNode;
  level: number;
  selectionRange: SelectionRange;
  onUpdateSelectionRange: (range: SelectionRange) => void;
  onViewFile?: (node: FileSystemNode) => void;
  bucketName?: AvailableBuckets; // Allow explicit bucket override for multi-bucket scenarios
}

export function NodeItem({ 
  node, 
  level,
  selectionRange,
  onUpdateSelectionRange,
  onViewFile,
  bucketName: explicitBucket
}: NodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  
  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  // Use explicit bucket if provided, otherwise fall back to activeBucket
  const bucketName = explicitBucket || activeBucket;
  const slice = createFileSystemSlice(bucketName);
  const selectors = createFileSystemSelectors(bucketName);
  const { actions } = slice;
  
  const activeNode = useAppSelector(selectors.selectActiveNode);
  const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
  const childNodes = useAppSelector(selectors.selectNodeChildren(node.itemId));
  const isFolder = node.contentType === 'FOLDER';

  const isSelected = selectedNodes.some(n => n.itemId === node.itemId);
  
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isShiftKey = e.shiftKey;
    const isCtrlKey = e.ctrlKey || e.metaKey;
    
    if (isShiftKey && selectionRange.start) {
      onUpdateSelectionRange({
        start: selectionRange.start,
        end: node.itemId
      });
    }

    dispatch(actions.selectNode({
      nodeId: node.itemId,
      isMultiSelect: isCtrlKey,
      isRangeSelect: isShiftKey
    }));

    if (!isCtrlKey && !isShiftKey) {
      onUpdateSelectionRange({
        start: node.itemId,
        end: null
      });
    }

    if (isFolder && e.detail === 1) { // Only toggle on single click
      const newExpandedState = !isExpanded;
      setIsExpanded(newExpandedState);
      
      if (newExpandedState) {
        setIsLoadingFolder(true);
        try {
          await dispatch(actions.listContents({
            forceFetch: false,
          }));
        } finally {
          setIsLoadingFolder(false);
        }
      }
    } else if (!isFolder && onViewFile && !isCtrlKey && !isShiftKey) {
      // Call onViewFile for regular file clicks (not folders, not multi-select)
      onViewFile(node);
    }
  }, [dispatch, actions, node.itemId, isFolder, isExpanded, selectionRange.start, onUpdateSelectionRange, onViewFile, node]);

  const handleRename = async (newName: string) => {
    dispatch(actions.selectNode({
      nodeId: node.itemId,
      isMultiSelect: false,
      isRangeSelect: false
    }));

    await dispatch(actions.renameActiveNode({
      newName
    }));
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedNodes.length === 1) {
      setIsEditing(true);
    }
  };

  // Track if name is truncated
  const [isTruncated, setIsTruncated] = React.useState(false);
  const nameRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (nameRef.current) {
      setIsTruncated(nameRef.current.scrollWidth > nameRef.current.clientWidth);
    }
  }, [node.name]);

  // Get the appropriate icon for this node using the existing comprehensive system
  const iconDetails = isFolder 
    ? getFolderDetails(node.name)
    : getFileDetailsByExtension(node.name);
  const IconComponent = iconDetails.icon;
  const iconColor = iconDetails.color || 'text-gray-500';

  // Context menu wrapped content
  const contextMenuContent = (
    <FileContextMenu
      node={node}
      selectedNodes={selectedNodes}
      onViewFile={onViewFile}
      bucketName={bucketName}
    >
      <div
        className={cn(
          'group/node flex items-center py-0.5 px-1 hover:bg-accent/50 cursor-pointer relative text-xs leading-tight',
          isSelected && 'bg-accent',
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isFolder && (
          <span className="h-3.5 w-3.5 flex items-center justify-center flex-shrink-0">
            {isLoadingFolder ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            ) : isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        <IconComponent className={cn("h-3.5 w-3.5 mx-1 flex-shrink-0", iconColor)} />
        <div ref={nameRef} className="flex-1 min-w-0">
          {isTruncated ? (
            <TooltipProvider delayDuration={1000}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <FileNameEditor
                      name={node.name}
                      extension={node.extension}
                      isEditing={isEditing}
                      onRename={handleRename}
                      onCancel={() => setIsEditing(false)}
                      className="text-xs truncate"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {node.name}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <FileNameEditor
              name={node.name}
              extension={node.extension}
              isEditing={isEditing}
              onRename={handleRename}
              onCancel={() => setIsEditing(false)}
              className="text-xs truncate"
            />
          )}
        </div>
        <FileContextMenu
          node={node}
          selectedNodes={selectedNodes}
          asDropdown
          onViewFile={onViewFile}
          bucketName={bucketName}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-2 opacity-0 group-hover/node:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </FileContextMenu>
      </div>
    </FileContextMenu>
  );

  // Wrap with draggable/droppable
  const wrappedContent = isFolder ? (
    <DroppableFolder id={node.itemId}>
      {contextMenuContent}
    </DroppableFolder>
  ) : (
    <DraggableNode id={node.itemId} isSelected={isSelected}>
      {contextMenuContent}
    </DraggableNode>
  );

  return (
    <div className="select-none">
      {wrappedContent}
      {isFolder && isExpanded && (
        <div>
          {childNodes.map((childNode) => (
            <NodeItem
              key={childNode.itemId}
              node={childNode}
              level={level + 1}
              selectionRange={selectionRange}
              onUpdateSelectionRange={onUpdateSelectionRange}
              onViewFile={onViewFile}
              bucketName={bucketName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
