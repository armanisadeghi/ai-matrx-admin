"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Clock, DollarSign, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiRun } from "../types";
import { formatCost } from "../utils/cost-calculator";
import { getRunPreview } from "../utils/run-helpers";

interface RunItemProps {
  run: AiRun;
  isActive?: boolean;
  onClick?: () => void;
  onStar?: () => void;
  compact?: boolean;
}

export function RunItem({ run, isActive, onClick, onStar, compact = false }: RunItemProps) {
  const preview = getRunPreview(run, compact ? 60 : 100);
  const timeAgo = formatDistanceToNow(new Date(run.last_message_at), { addSuffix: true });

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm",
        isActive 
          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" 
          : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700",
        compact && "p-2"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-medium text-gray-900 dark:text-gray-100 truncate",
            compact ? "text-sm" : "text-base"
          )}>
            {run.name || "Untitled Run"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {timeAgo}
          </p>
        </div>
        
        {/* Star button */}
        {onStar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar();
            }}
            className={cn(
              "flex-shrink-0 p-1 rounded transition-colors",
              run.is_starred
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            )}
          >
            <Star className={cn("w-4 h-4", run.is_starred && "fill-current")} />
          </button>
        )}
      </div>

      {/* Preview */}
      {!compact && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {preview}
        </p>
      )}

      {/* Stats */}
      <div className={cn(
        "flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400",
        compact && "gap-2"
      )}>
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{run.message_count}</span>
        </div>
        
        {!compact && run.total_tokens > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{run.total_tokens.toLocaleString()} tokens</span>
          </div>
        )}
        
        {run.total_cost > 0 && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{formatCost(run.total_cost)}</span>
          </div>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 dark:bg-blue-400 rounded-r" />
      )}
    </div>
  );
}

