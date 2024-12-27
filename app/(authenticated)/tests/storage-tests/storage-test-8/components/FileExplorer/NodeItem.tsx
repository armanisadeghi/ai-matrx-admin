// NodeItem.tsx
import React, { useState, useRef, useEffect } from "react";
import { FileSystemNode } from "@/lib/redux/fileSystem/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileNameEditor } from "./FileNameEditor";

interface NodeItemProps {
  node: FileSystemNode;
  level: number;
}

export default function NodeItem({ node, level }: NodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  const slice = createFileSystemSlice(activeBucket);
  const selectors = createFileSystemSelectors(activeBucket);
  const { actions } = slice;
  const activeNode = useAppSelector(selectors.selectActiveNode);
  const childNodes = useAppSelector(selectors.selectNodeChildren(node.itemId));
  const isFolder = node.contentType === "FOLDER";

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

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    dispatch(
      actions.selectNode({
        nodeId: node.itemId,
        isMultiSelect: false,
        isRangeSelect: false,
      })
    );

    if (isFolder) {
      setIsExpanded(!isExpanded);
      await dispatch(
        actions.listContents({
          forceFetch: false,
        })
      );
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const isSelected = activeNode?.itemId === node.itemId;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center py-1 px-2 hover:bg-accent rounded-sm cursor-pointer",
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
        />{" "}
      </div>
      {isFolder && isExpanded && (
        <div className="ml-4">
          {childNodes.map((childNode) => (
            <NodeItem
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
