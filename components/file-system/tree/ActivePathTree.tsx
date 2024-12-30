// FileTree.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { SelectionRange } from "../types";
import { FileSystemNode } from "@/lib/redux/fileSystem/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileNameEditor } from "./FileNameEditor";
import { isInPath } from "../utils";

interface NodeItemProps {
  node: FileSystemNode;
  level: number;
  selectionRange: SelectionRange;
  onUpdateSelectionRange: (range: SelectionRange) => void;
}

interface ActiveNodeItemProps extends Omit<NodeItemProps, "isExpanded"> {
  defaultExpanded?: boolean;
}

// Modified NodeItem that manages expansion state based on active path
function ActiveNodeItem({
  node,
  level,
  selectionRange,
  onUpdateSelectionRange,
  defaultExpanded = false,
}: ActiveNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditing, setIsEditing] = useState(false);

  const { activeBucket } = useFileSystem();
  const selectors = createFileSystemSelectors(activeBucket);
  const activeNode = useAppSelector(selectors.selectActiveNode);

  const dispatch = useAppDispatch();
  const slice = createFileSystemSlice(activeBucket);
  const { actions } = slice;

  const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
  const childNodes = useAppSelector(selectors.selectNodeChildren(node.itemId));
  const isFolder = node.contentType === "FOLDER";

  useEffect(() => {
    if (
      activeNode &&
      (isInPath(activeNode, node) || node.itemId === activeNode.itemId)
    ) {
      setIsExpanded(true);
    }
  }, [activeNode, node]);

  const isSelected = selectedNodes.some((n) => n.itemId === node.itemId);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      const isShiftKey = e.shiftKey;
      const isCtrlKey = e.ctrlKey || e.metaKey;

      if (isShiftKey && selectionRange.start) {
        // Range selection
        onUpdateSelectionRange({
          start: selectionRange.start,
          end: node.itemId,
        });
      }

      dispatch(
        actions.selectNode({
          nodeId: node.itemId,
          isMultiSelect: isCtrlKey,
          isRangeSelect: isShiftKey,
        })
      );

      if (!isCtrlKey && !isShiftKey) {
        // Single selection, update range start
        onUpdateSelectionRange({
          start: node.itemId,
          end: null,
        });
      }

      if (isFolder) {
        setIsExpanded(!isExpanded);
        await dispatch(
          actions.listContents({
            forceFetch: false,
          })
        );
      }
    },
    [
      dispatch,
      actions,
      node.itemId,
      isFolder,
      selectionRange.start,
      onUpdateSelectionRange,
    ]
  );

  const handleRename = async (newName: string) => {
    dispatch(
      actions.selectNode({
        nodeId: node.itemId,
        isMultiSelect: false,
        isRangeSelect: false,
      })
    );

    await dispatch(
      actions.renameActiveNode({
        newName,
      })
    );
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
          "flex items-center py-1 px-2 hover:bg-accent/50 rounded-sm cursor-pointer",
          isSelected && "bg-accent",
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
            <ActiveNodeItem
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

export function ActivePathTree() {
    const { activeBucket } = useFileSystem();
    const selectors = createFileSystemSelectors(activeBucket);
    const allNodes = useAppSelector(selectors.selectAllNodes);
    const rootNodes = allNodes.filter(node => node.parentId === "root");
    const activeNode = useAppSelector(selectors.selectActiveNode);
    
    const [selectionRange, setSelectionRange] = useState<SelectionRange>({
      start: null,
      end: null
    });
  
    return (
      <div className="min-h-[300px]">
        {rootNodes.length > 0 ? (
          rootNodes.map((node) => (
            <ActiveNodeItem
              key={node.itemId}
              node={node}
              level={0}
              selectionRange={selectionRange}
              onUpdateSelectionRange={setSelectionRange}
              defaultExpanded={activeNode && isInPath(activeNode, node)}
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
  