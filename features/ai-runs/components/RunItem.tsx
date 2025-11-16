"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Star, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiRunsService } from "../services/ai-runs-service";
import type { AiRun } from "../types";

interface RunItemProps {
  run: AiRun;
  isActive?: boolean;
  onClick?: () => void;
  onStar?: () => void;
  onUpdate?: () => void;
  compact?: boolean;
}

/**
 * Format time in ultra-compact format (e.g., "25m", "3h", "2d")
 */
function getCompactTimeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}d`;
  return `${Math.floor(diffDays / 30)}mo`;
}

export function RunItem({ run, isActive, onClick, onStar, onUpdate, compact = false }: RunItemProps) {
  const timeAgo = getCompactTimeAgo(new Date(run.last_message_at));
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(run.name || 'Untitled');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!editValue.trim() || editValue === run.name) {
      setIsEditing(false);
      setEditValue(run.name || 'Untitled');
      return;
    }

    setIsSaving(true);
    try {
      await aiRunsService.update(run.id, { name: editValue.trim() });
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating run name:', error);
      setEditValue(run.name || 'Untitled');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(run.name || 'Untitled');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div
        className={cn(
          "group relative px-2 py-1 rounded border transition-all",
          "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
        )}
      >
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="flex-1 min-w-0 bg-transparent text-xs font-medium text-gray-900 dark:text-gray-100 outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            disabled={isSaving}
            className="flex-shrink-0 p-0.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            title="Save"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            disabled={isSaving}
            className="flex-shrink-0 p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            title="Cancel"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative px-2 py-1 rounded border transition-all cursor-pointer",
        isActive 
          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" 
          : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-850"
      )}
    >
      {/* Content - single line */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Left side: Name and metadata */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 text-xs">
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {run.name || 'Untitled'}
          </span>
          <span className="text-gray-300 dark:text-gray-700 flex-shrink-0">•</span>
          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{timeAgo}</span>
          <span className="text-gray-300 dark:text-gray-700 flex-shrink-0">•</span>
          <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400 flex-shrink-0">
            <MessageSquare className="w-3 h-3" />
            <span>{run.message_count}</span>
          </div>
        </div>
        
        {/* Right side: Edit and Star buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-0.5 rounded transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100"
            title="Rename"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {onStar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStar();
              }}
              className={cn(
                "p-0.5 rounded transition-colors",
                run.is_starred
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100"
              )}
              title={run.is_starred ? "Unstar" : "Star"}
            >
              <Star className={cn("w-3 h-3", run.is_starred && "fill-current")} />
            </button>
          )}
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 dark:bg-blue-400 rounded-r" />
      )}
    </div>
  );
}

