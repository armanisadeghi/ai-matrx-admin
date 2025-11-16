"use client";

import React from "react";
import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ChildPillContextMenu from "../context-menus/ChildPillContextMenu";

interface ChildPillProps {
  childName: string;
  childId: string;
  childData: any;
  order?: number;
  onRemove: () => void;
  isDisabled?: boolean;
  parentId: string;
}

const ChildPill: React.FC<ChildPillProps> = ({ 
  childName, 
  childId,
  childData,
  order, 
  onRemove, 
  isDisabled = false,
  parentId,
}) => {
  return (
    <ChildPillContextMenu
      childId={childId}
      childData={childData}
      parentId={parentId}
      order={order}
      onRemove={onRemove}
    >
      <motion.div
        className="px-3 py-0 rounded-xl flex items-center gap-2 bg-indigo-400 dark:bg-indigo-500"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-[200px] text-ellipsis overflow-hidden cursor-help inline-block">
              {childName}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {childName}
          </TooltipContent>
        </Tooltip>
        
        {order !== undefined && (
          <span className="text-xs bg-indigo-600 dark:bg-indigo-800 rounded-full px-2 py-0.5">
            Order: {order}
          </span>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-4 h-4 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors flex-shrink-0"
          disabled={isDisabled}
        >
          <span className="text-xs">×</span>
        </button>
      </motion.div>
    </ChildPillContextMenu>
  );
};

export default ChildPill; 