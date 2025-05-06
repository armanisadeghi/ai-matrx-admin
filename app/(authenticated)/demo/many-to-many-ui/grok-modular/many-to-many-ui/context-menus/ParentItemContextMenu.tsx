"use client";

import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from "@/components/ui/context-menu";

interface ParentItemContextMenuProps {
  children: React.ReactNode;
  parentId: string;
  parentData: any;
  childrenCollection: any[];
  config: any;
}

const ParentItemContextMenu: React.FC<ParentItemContextMenuProps> = ({
  children,
  parentId,
  parentData,
  childrenCollection,
  config
}) => {
  const handleEditParent = () => {
    console.log(`Edit parent entity:`, parentId, parentData);
  };

  const handleViewParent = () => {
    console.log(`View parent entity details:`, parentData);
  };
  
  const handleCopyParentId = () => {
    console.log(`Copy parent entity ID:`, parentId);
    navigator.clipboard.writeText(parentId);
  };

  const handleDuplicateParent = () => {
    console.log(`Duplicate parent entity:`, parentId, parentData);
  };
  
  const handleDeleteParent = () => {
    console.log(`Delete parent entity:`, parentId, parentData);
  };
  
  const handleClearAllAssociations = () => {
    console.log(`Clear all associations for parent:`, parentId, childrenCollection);
  };
  
  // Get child name for display
  const getChildName = (child: any) => {
    return child[config.childDisplayConfig.primaryField] || 
           config.childDisplayConfig.fallbackPrimary || 
           "Unnamed";
  };
  
  // Add a right-click handler to prevent default and stop propagation
  const handleRightClick = (e: React.MouseEvent) => {
    // Only prevent propagation if this element is directly right-clicked
    e.stopPropagation();
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={handleRightClick}>
        <div className="w-full cursor-context-menu" onContextMenu={handleRightClick}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[180px] z-50">
        <ContextMenuItem onClick={handleViewParent}>
          View entity details
        </ContextMenuItem>
        <ContextMenuItem onClick={handleEditParent}>
          Edit entity
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        {childrenCollection.length > 0 && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                Associated children
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="min-w-[160px]">
                {childrenCollection.map((child) => (
                  <ContextMenuItem 
                    key={child.id} 
                    className="text-sm"
                  >
                    {getChildName(child)}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem onClick={handleClearAllAssociations}>
              Clear all associations
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        
        <ContextMenuItem onClick={handleCopyParentId}>
          Copy entity ID
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicateParent}>
          Duplicate entity
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={handleDeleteParent} 
          className="text-red-500 dark:text-red-400"
        >
          Delete entity
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ParentItemContextMenu; 