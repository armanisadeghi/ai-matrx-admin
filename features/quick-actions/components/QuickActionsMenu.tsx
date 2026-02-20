// features/quick-actions/components/QuickActionsMenu.tsx
"use client";

import React from 'react';
import { StickyNote, Zap, LayoutGrid, CheckSquare, MessageSquare, Database, FolderOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuickActions } from '../hooks/useQuickActions';

interface QuickActionsMenuProps {
    className?: string;
}

export function QuickActionsMenu({ className }: QuickActionsMenuProps) {
    const {
        openQuickNotes,
        openQuickTasks,
        openQuickChat,
        openQuickData,
        openQuickFiles,
        openQuickUtilities,
        openQuickAIResults,
    } = useQuickActions();

    return (
        <DropdownMenu>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`p-2 rounded-full ${className}`}
                            >
                                <Zap className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Quick Actions</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Quick Access</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {/* Notes Option */}
                        <DropdownMenuItem
                            onClick={() => openQuickNotes()}
                            className="cursor-pointer"
                        >
                            <StickyNote className="h-4 w-4 mr-2" />
                            <div className="flex flex-col">
                                <span>Notes</span>
                                <span className="text-xs text-zinc-500">Quick capture & retrieve</span>
                            </div>
                        </DropdownMenuItem>

                        {/* Tasks Option */}
                        <DropdownMenuItem
                            onClick={() => openQuickTasks()}
                            className="cursor-pointer"
                        >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            <div className="flex flex-col">
                                <span>Tasks</span>
                                <span className="text-xs text-zinc-500">Manage tasks & projects</span>
                            </div>
                        </DropdownMenuItem>

                        {/* Chat Option */}
                        <DropdownMenuItem
                            onClick={() => openQuickChat()}
                            className="cursor-pointer"
                        >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            <div className="flex flex-col">
                                <span>Chat</span>
                                <span className="text-xs text-zinc-500">AI conversation assistant</span>
                            </div>
                        </DropdownMenuItem>

                        {/* Data Option */}
                        <DropdownMenuItem
                            onClick={() => openQuickData()}
                            className="cursor-pointer"
                        >
                            <Database className="h-4 w-4 mr-2" />
                            <div className="flex flex-col">
                                <span>Data</span>
                                <span className="text-xs text-zinc-500">View & manage tables</span>
                            </div>
                        </DropdownMenuItem>

                        {/* Files Option */}
                        <DropdownMenuItem
                            onClick={() => openQuickFiles()}
                            className="cursor-pointer"
                        >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            <div className="flex flex-col">
                                <span>Files</span>
                                <span className="text-xs text-zinc-500">Upload & browse files</span>
                            </div>
                        </DropdownMenuItem>

                        {/* AI Results Option */}
                        <DropdownMenuItem
                            onClick={() => openQuickAIResults()}
                            className="cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            <div className="flex flex-col">
                                <span>AI Results</span>
                                <span className="text-xs text-zinc-500">Recent prompt results</span>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Utilities Hub Option */}
                        <DropdownMenuItem
                            onClick={() => openQuickUtilities()}
                            className="cursor-pointer"
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            <div className="flex flex-col">
                                <span>Utilities Hub</span>
                                <span className="text-xs text-zinc-500">Full view with all tools</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
        </DropdownMenu>
    );
}

