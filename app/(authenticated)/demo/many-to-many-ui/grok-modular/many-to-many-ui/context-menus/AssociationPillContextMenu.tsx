"use client";

import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from "@/components/ui/context-menu";

interface AssociationPillContextMenuProps {
  children: React.ReactNode;
  parentId?: string;
  childId?: string;
  parentData?: any;
  childData?: any;
  associatedParents?: any[];
}

const AssociationPillContextMenu: React.FC<AssociationPillContextMenuProps> = ({
  children,
  parentId,
  childId,
  parentData,
  childData,
  associatedParents,
}) => {
  const handleViewParent = () => {
    console.log(`View parent details:`, parentData);
  };

  const handleViewAllAssociations = () => {
    console.log(`View all associations for child:`, childId, associatedParents);
  };
  
  const handleCopyParentId = () => {
    console.log(`Copy parent ID:`, parentId);
    if (parentId) {
      navigator.clipboard.writeText(parentId);
    }
  };

  const handleCopyChildId = () => {
    console.log(`Copy child ID:`, childId);
    if (childId) {
      navigator.clipboard.writeText(childId);
    }
  };
  
  const handleCreateNewAssociation = () => {
    console.log(`Create new association for:`, childData);
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
        {parentData && (
          <ContextMenuItem onClick={handleViewParent}>
            View parent details
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleViewAllAssociations}>
          View all associations
        </ContextMenuItem>
        <ContextMenuSeparator />
        {parentId && (
          <ContextMenuItem onClick={handleCopyParentId}>
            Copy parent ID
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleCopyChildId}>
          Copy child ID
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCreateNewAssociation}>
          Create new association
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default AssociationPillContextMenu; 