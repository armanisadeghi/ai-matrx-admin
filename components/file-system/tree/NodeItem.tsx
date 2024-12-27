// NodeItem.tsx
import React, { useState, useCallback } from 'react';
import { FileSystemNode } from '@/lib/redux/fileSystem/types';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileNameEditor } from './FileNameEditor';
import { SelectionRange } from '../types';

interface NodeItemProps {
  node: FileSystemNode;
  level: number;
  selectionRange: SelectionRange;
  onUpdateSelectionRange: (range: SelectionRange) => void;
}

export function NodeItem({ 
  node, 
  level,
  selectionRange,
  onUpdateSelectionRange
}: NodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  const slice = createFileSystemSlice(activeBucket);
  const selectors = createFileSystemSelectors(activeBucket);
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
      // Range selection
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
      // Single selection, update range start
      onUpdateSelectionRange({
        start: node.itemId,
        end: null
      });
    }

    if (isFolder) {
      setIsExpanded(!isExpanded);
      await dispatch(actions.listContents({
        forceFetch: false,
      }));
    }
  }, [dispatch, actions, node.itemId, isFolder, selectionRange.start, onUpdateSelectionRange]);

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
    // Only allow rename on single selection
    if (selectedNodes.length === 1) {
      setIsEditing(true);
    }
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center py-1 px-2 hover:bg-accent/50 rounded-sm cursor-pointer',
          isSelected && 'bg-accent',
          `ml-${level * 4}`
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isFolder && (
          <span className="h-4 w-4">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
        {isFolder ? (
          <Folder className="h-4 w-4 text-blue-500 mx-2" />
        ) : (
          <File className="h-4 w-4 text-gray-500 mx-2" />
        )}
        <FileNameEditor
          name={node.name}
          extension={node.extension}
          isEditing={isEditing}
          onRename={handleRename}
          onCancel={() => setIsEditing(false)}
        />
      </div>
      {isFolder && isExpanded && (
        <div className="ml-4">
          {childNodes.map((childNode) => (
            <NodeItem
              key={childNode.itemId}
              node={childNode}
              level={level + 1}
              selectionRange={selectionRange}
              onUpdateSelectionRange={onUpdateSelectionRange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
