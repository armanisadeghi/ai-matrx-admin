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

interface ChildItemContextMenuProps {
  children: React.ReactNode;
  childId: string;
  childData: any;
  associatedParents: any[];
  config: any;
}

const ChildItemContextMenu: React.FC<ChildItemContextMenuProps> = ({
  children,
  childId,
  childData,
  associatedParents,
  config
}) => {
  const handleEditChild = () => {
    console.log(`Edit child entity:`, childId, childData);
  };

  const handleViewChild = () => {
    console.log(`View child entity details:`, childData);
  };
  
  const handleCopyChildId = () => {
    console.log(`Copy child entity ID:`, childId);
    navigator.clipboard.writeText(childId);
  };

  const handleDuplicateChild = () => {
    console.log(`Duplicate child entity:`, childId, childData);
  };
  
  const handleDeleteChild = () => {
    console.log(`Delete child entity:`, childId, childData);
  };
  
  const handleAssociateWithParent = (parentId: string) => {
    console.log(`Associate child with parent:`, childId, parentId);
  };
  
  // Add a right-click handler to prevent default and stop propagation
  const handleRightClick = (e: React.MouseEvent) => {
    // Only prevent propagation if this element is directly right-clicked
    // and not if the event is bubbling up from the association pill
    if (e.currentTarget === e.target) {
      e.stopPropagation();
    }
  };
  
  // Format parent name for display
  const getParentName = (parent: any) => {
    return parent[config.parentDisplayConfig.primaryField] || 
           config.parentDisplayConfig.fallbackPrimary || 
           "Unnamed";
  };
  
  // Get list of parents that this child is not yet associated with
  const unassociatedParents = React.useMemo(() => {
    if (!config.allParents) return [];
    
    const associatedParentIds = new Set(associatedParents.map((p: any) => p.id));
    return config.allParents.filter((p: any) => !associatedParentIds.has(p.id));
  }, [associatedParents, config.allParents]);
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={handleRightClick}>
        <div className="w-full" onContextMenu={handleRightClick}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[180px] z-50">
        <ContextMenuItem onClick={handleViewChild}>
          View entity details
        </ContextMenuItem>
        <ContextMenuItem onClick={handleEditChild}>
          Edit entity
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        {unassociatedParents.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              Associate with...
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-[160px]">
              {unassociatedParents.length > 0 ? (
                unassociatedParents.map((parent: any) => (
                  <ContextMenuItem 
                    key={parent.id} 
                    onClick={() => handleAssociateWithParent(parent.id)}
                  >
                    {getParentName(parent)}
                  </ContextMenuItem>
                ))
              ) : (
                <ContextMenuItem disabled>
                  No available parents
                </ContextMenuItem>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        
        <ContextMenuItem onClick={handleCopyChildId}>
          Copy entity ID
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicateChild}>
          Duplicate entity
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={handleDeleteChild} 
          className="text-red-500 dark:text-red-400"
        >
          Delete entity
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ChildItemContextMenu; 