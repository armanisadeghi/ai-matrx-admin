"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTitleCase } from "@/utils/text/text-case-converter";
import type { AiRun } from "../types";

interface RunItemProps {
  run: AiRun;
  isActive?: boolean;
  onClick?: () => void;
  onStar?: () => void;
  compact?: boolean;
}

/**
 * Get a display-friendly representation of variable values
 */
function getVariableDisplay(variableValues: Record<string, string>): string {
  if (!variableValues || Object.keys(variableValues).length === 0) {
    return "No variables";
  }
  
  // Get the first 2 variables to display
  const entries = Object.entries(variableValues).slice(0, 2);
  
  return entries
    .map(([key, value]) => {
      // Format the key to be more readable (snake_case -> Title Case)
      const formattedKey = formatTitleCase(key);
      // Truncate long values
      const truncatedValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
      return `${formattedKey}: ${truncatedValue}`;
    })
    .join(', ');
}

export function RunItem({ run, isActive, onClick, onStar, compact = false }: RunItemProps) {
  const timeAgo = formatDistanceToNow(new Date(run.last_message_at), { addSuffix: true });
  const variableDisplay = getVariableDisplay(run.variable_values);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative px-2.5 py-2 rounded border transition-all cursor-pointer",
        isActive 
          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" 
          : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-850"
      )}
    >
      {/* Single line layout */}
      <div className="flex items-start gap-1.5">
        {/* Star button */}
        {onStar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar();
            }}
            className={cn(
              "flex-shrink-0 p-0.5 rounded transition-colors mt-0.5",
              run.is_starred
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100"
            )}
          >
            <Star className={cn("w-3 h-3", run.is_starred && "fill-current")} />
          </button>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Variables display - primary identifier */}
          <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {variableDisplay}
          </div>
          
          {/* Time and message count - secondary info */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span className="truncate">{timeAgo}</span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <MessageSquare className="w-3 h-3" />
              <span>{run.message_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 dark:bg-blue-400 rounded-r" />
      )}
    </div>
  );
}

