"use client";

import React, { ReactNode } from "react";
import { X, Eye, Code, Cloud, Share2, CloudOff, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ViewMode = 'preview' | 'source' | 'library';

export interface CanvasHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  onClose: () => void;
  
  // View mode toggle
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  hideViewToggle?: boolean;
  showLibraryToggle?: boolean;
  
  // Cloud sync
  isSynced?: boolean;
  isSyncing?: boolean;
  onSync?: () => void;
  hideSync?: boolean;
  
  // Share
  onShare?: () => void;
  hideShare?: boolean;
  
  // Custom actions - rendered between sync and close
  customActions?: ReactNode;
  
  // Style customization
  className?: string;
  variant?: 'default' | 'minimal' | 'compact';
}

/**
 * CanvasHeader - Flexible header component for canvas panels
 * 
 * Features:
 * - Source/Preview toggle for all canvas types
 * - Cloud sync status and manual sync trigger
 * - Share functionality
 * - Custom actions slot for canvas-specific controls
 * - Professional rounded design with proper borders
 */
export function CanvasHeader({
  title,
  subtitle,
  onClose,
  viewMode = 'preview',
  onViewModeChange,
  hideViewToggle = false,
  showLibraryToggle = false,
  isSynced,
  isSyncing = false,
  onSync,
  hideSync = false,
  onShare,
  hideShare = false,
  customActions,
  className,
  variant = 'default',
}: CanvasHeaderProps) {
  
  const isMinimal = variant === 'minimal';
  const isCompact = variant === 'compact';
  const isLibraryMode = viewMode === 'library';
  
  // Compact mode: VS Code-style tiny buttons
  const buttonSize = isCompact ? "h-6 px-1.5" : "h-7 px-2.5";
  const iconSize = isCompact ? "w-3 h-3" : "w-3.5 h-3.5";
  const iconOnlySize = isCompact ? "h-6 w-6" : "h-7 w-7";
  const textSize = isCompact ? "text-[10px]" : "text-xs";
  const iconMargin = isCompact ? "mr-1" : "mr-1.5";
  
  return (
    <TooltipProvider delayDuration={300}>
      <div 
        className={cn(
          "flex-shrink-0 flex items-center justify-between gap-3",
          "bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-sm",
          "border-b border-zinc-200 dark:border-zinc-800",
          isCompact ? "px-2 py-1" : isMinimal ? "px-4 py-2" : "px-4 py-2.5",
          className
        )}
      >
        {/* Left: Title and Subtitle */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 min-w-0",
            isCompact ? "text-xs" : "text-sm"
          )}>
            {typeof title === 'string' ? (
              <span className="truncate">{title}</span>
            ) : (
              title
            )}
          </div>
          {subtitle && (
            <div className={cn(
              "text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2 min-w-0",
              isCompact ? "text-[10px]" : "text-xs"
            )}>
              {typeof subtitle === 'string' ? (
                <span className="truncate">{subtitle}</span>
              ) : (
                subtitle
              )}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {/* View Mode Toggle */}
          {!hideViewToggle && onViewModeChange && (
            <div className={cn(
              "flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg",
              isCompact ? "p-0.5" : "p-0.5"
            )}>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => onViewModeChange('source')}
                     className={cn(
                       buttonSize, textSize, "rounded-md transition-colors",
                       viewMode === 'source'
                         ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                         : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                     )}
                   >
                     <Code className={cn(iconSize, iconMargin)} />
                     {!isCompact && "Source"}
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom" sideOffset={8}>
                   View source data
                 </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewModeChange('preview')}
                    className={cn(
                      buttonSize, textSize, "rounded-md transition-colors",
                      viewMode === 'preview'
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    <Eye className={cn(iconSize, iconMargin)} />
                    {!isCompact && "Preview"}
                  </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom" sideOffset={8}>
                   Preview mode
                 </TooltipContent>
               </Tooltip>

            </div>
          )}

          {/* Divider */}
          {(!hideViewToggle || customActions) && !hideSync && (
            <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />
          )}

          {/* Custom Actions Slot */}
          {customActions}

          {/* Library Toggle */}
          {showLibraryToggle && onViewModeChange && (
            <>
              {(customActions || !hideViewToggle) && (
                <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewModeChange(isLibraryMode ? 'preview' : 'library')}
                    className={cn(
                      iconOnlySize, "p-0",
                      isLibraryMode 
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" 
                        : "text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    <Library className={iconSize} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  {isLibraryMode ? 'Back to canvas' : 'View saved items'}
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Cloud Sync */}
          {!hideSync && onSync && !isLibraryMode && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSync}
                    disabled={isSyncing}
                    className={cn(
                      iconOnlySize, "p-0",
                      isSynced && !isSyncing && "text-green-600 dark:text-green-500",
                      !isSynced && !isSyncing && "text-zinc-500 dark:text-zinc-400",
                      isSyncing && "text-blue-600 dark:text-blue-500"
                    )}
                  >
                    {isSynced && !isSyncing ? (
                      <Cloud className={cn(iconSize, isSyncing && "animate-pulse")} />
                    ) : (
                      <CloudOff className={cn(iconSize, isSyncing && "animate-pulse")} />
                    )}
                  </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom" sideOffset={8}>
                   {isSyncing ? 'Syncing...' : isSynced ? 'Synced to cloud' : 'Not synced - Click to sync'}
                 </TooltipContent>
               </Tooltip>
             </>
           )}

           {/* Share */}
           {!hideShare && onShare && (
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={onShare}
                   className={cn(iconOnlySize, "p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100")}
                 >
                   <Share2 className={iconSize} />
                 </Button>
               </TooltipTrigger>
               <TooltipContent side="bottom" sideOffset={8}>
                 Share
               </TooltipContent>
             </Tooltip>
           )}

           {/* Divider before close */}
           <div className={cn("w-px bg-zinc-300 dark:bg-zinc-700", isCompact ? "h-4 mx-0.5" : "h-5 mx-1")} />

           {/* Close Button */}
           <Tooltip>
             <TooltipTrigger asChild>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={onClose}
                 className={cn(iconOnlySize, "p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800")}
               >
                 <X className={iconSize} />
               </Button>
             </TooltipTrigger>
             <TooltipContent side="bottom" sideOffset={8}>
               Close canvas
             </TooltipContent>
           </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

