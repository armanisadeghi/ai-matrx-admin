"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AssociationPillContextMenu from "../context-menus/AssociationPillContextMenu";

interface AssociationPillProps {
  count: number;
  text: string;
  tooltipText: string;
  parentId?: string;
  childId?: string;
  parentData?: any;
  childData?: any;
  associatedParents?: any[];
}

const AssociationPill: React.FC<AssociationPillProps> = ({ 
  count, 
  text, 
  tooltipText,
  parentId,
  childId,
  parentData,
  childData,
  associatedParents = []
}) => {
  return (
    <AssociationPillContextMenu
      parentId={parentId}
      childId={childId}
      parentData={parentData}
      childData={childData}
      associatedParents={associatedParents}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`text-xs px-2 py-1 rounded-xl flex-shrink-0 max-w-[120px] truncate cursor-help ${
              count === 0
                ? "bg-orange-400 dark:bg-orange-600"
                : "bg-green-400 dark:bg-green-600"
            }`}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </AssociationPillContextMenu>
  );
};

export default AssociationPill; 