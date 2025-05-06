"use client";

import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from "@/components/ui/context-menu";

interface ChildPillContextMenuProps {
  children: React.ReactNode;
  childId: string;
  childData: any;
  parentId: string;
  order?: number;
  onRemove: () => void;
}

const ChildPillContextMenu: React.FC<ChildPillContextMenuProps> = ({
  children,
  childId,
  childData,
  parentId,
  order,
  onRemove,
}) => {
  const handleEditChild = () => {
    console.log(`Edit child:`, childId, childData);
  };

  const handleViewChild = () => {
    console.log(`View child details:`, childData);
  };
  
  const handleCopyChildId = () => {
    console.log(`Copy child ID:`, childId);
    navigator.clipboard.writeText(childId);
  };

  const handleChangeOrder = () => {
    console.log(`Change order for child in relationship:`, childId, parentId, order);
  };
  
  const handleRemoveFromParent = () => {
    console.log(`Remove child from parent:`, childId, parentId);
    if (onRemove) {
      onRemove();
    }
  };
  
  // Add a right-click handler to prevent default and stop propagation
  const handleRightClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't call preventDefault() as it would prevent the context menu
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={handleRightClick}>
        <div className="contents" onContextMenu={handleRightClick}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[160px] z-50">
        <ContextMenuItem onClick={handleViewChild}>
          View child details
        </ContextMenuItem>
        <ContextMenuItem onClick={handleEditChild}>
          Edit child
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleChangeOrder}>
          Change order
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyChildId}>
          Copy child ID
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={handleRemoveFromParent} 
          className="text-red-500 dark:text-red-400"
        >
          Remove from parent
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ChildPillContextMenu; 