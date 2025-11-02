// features/tasks/components/QuickTasksSheet.tsx
"use client";

import React from 'react';
import TaskApp from './TaskApp';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface QuickTasksSheetProps {
    onClose?: () => void;
    className?: string;
}

/**
 * QuickTasksSheet - Wrapper for TaskApp to be used in FloatingSheet
 * Provides quick access to tasks without losing context
 */
export function QuickTasksSheet({ onClose, className }: QuickTasksSheetProps) {
    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Compact Header */}
            <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex-1" />
                
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open('/tasks', '_blank')}
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in New Tab</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Task App - Takes full remaining space */}
            <div className="flex-1 overflow-hidden">
                <TaskApp />
            </div>
        </div>
    );
}

