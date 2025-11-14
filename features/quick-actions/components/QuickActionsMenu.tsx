// features/quick-actions/components/QuickActionsMenu.tsx
"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { StickyNote, Zap, LayoutGrid, CheckSquare, MessageSquare, Database, FolderOpen } from 'lucide-react';
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
import FloatingSheet from '@/components/ui/matrx/FloatingSheet';

// CRITICAL: Dynamic imports to prevent loading on every route
// This component is in DesktopLayout (global), so we must lazy-load feature components
const QuickNotesSheet = dynamic(() => import('@/features/notes/components/QuickNotesSheet').then(mod => ({ default: mod.QuickNotesSheet })), {
  ssr: false,
});

const QuickTasksSheet = dynamic(() => import('@/features/tasks/components/QuickTasksSheet').then(mod => ({ default: mod.QuickTasksSheet })), {
  ssr: false,
});

const QuickChatSheet = dynamic(() => import('./QuickChatSheet').then(mod => ({ default: mod.QuickChatSheet })), {
  ssr: false,
});

const QuickDataSheet = dynamic(() => import('./QuickDataSheet').then(mod => ({ default: mod.QuickDataSheet })), {
  ssr: false,
});

const QuickFilesSheet = dynamic(() => import('./QuickFilesSheet').then(mod => ({ default: mod.QuickFilesSheet })), {
  ssr: false,
});

const UtilitiesOverlay = dynamic(() => import('./UtilitiesOverlay').then(mod => ({ default: mod.UtilitiesOverlay })), {
  ssr: false,
});

interface QuickActionsMenuProps {
    className?: string;
}

export function QuickActionsMenu({ className }: QuickActionsMenuProps) {
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isTasksOpen, setIsTasksOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isDataOpen, setIsDataOpen] = useState(false);
    const [isFilesOpen, setIsFilesOpen] = useState(false);
    const [isUtilitiesOpen, setIsUtilitiesOpen] = useState(false);

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <DropdownMenu>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={className}
                                >
                                    <Zap className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Quick Actions</TooltipContent>

                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Quick Access</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* Notes Option */}
                            <DropdownMenuItem
                                onClick={() => setIsNotesOpen(true)}
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
                                onClick={() => setIsTasksOpen(true)}
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
                                onClick={() => setIsChatOpen(true)}
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
                                onClick={() => setIsDataOpen(true)}
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
                                onClick={() => setIsFilesOpen(true)}
                                className="cursor-pointer"
                            >
                                <FolderOpen className="h-4 w-4 mr-2" />
                                <div className="flex flex-col">
                                    <span>Files</span>
                                    <span className="text-xs text-zinc-500">Upload & browse files</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Utilities Hub Option */}
                            <DropdownMenuItem
                                onClick={() => setIsUtilitiesOpen(true)}
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
                </Tooltip>
            </TooltipProvider>

            {/* CRITICAL: Conditionally render to prevent API calls on page load */}
            {/* Only mount components when sheets are actually open */}
            
            {/* Notes Sheet */}
            {isNotesOpen && (
                <FloatingSheet
                    isOpen={true}
                    onClose={() => setIsNotesOpen(false)}
                    title="Quick Notes"
                    position="right"
                    width="xl"
                    height="full"
                    closeOnBackdropClick={true}
                    closeOnEsc={true}
                    showCloseButton={true}
                >
                    <QuickNotesSheet onClose={() => setIsNotesOpen(false)} />
                </FloatingSheet>
            )}

            {/* Tasks Sheet */}
            {isTasksOpen && (
                <FloatingSheet
                    isOpen={true}
                    onClose={() => setIsTasksOpen(false)}
                    title="Quick Tasks"
                    position="right"
                    width="xl"
                    height="full"
                    closeOnBackdropClick={true}
                    closeOnEsc={true}
                    showCloseButton={true}
                >
                    <QuickTasksSheet onClose={() => setIsTasksOpen(false)} />
                </FloatingSheet>
            )}

            {/* Chat Sheet */}
            {isChatOpen && (
                <FloatingSheet
                    isOpen={true}
                    onClose={() => setIsChatOpen(false)}
                    title=""
                    position="right"
                    width="xl"
                    height="full"
                    closeOnBackdropClick={true}
                    closeOnEsc={true}
                    showCloseButton={false}
                    contentClassName="p-0"
                >
                    <QuickChatSheet onClose={() => setIsChatOpen(false)} />
                </FloatingSheet>
            )}

            {/* Data Sheet */}
            {isDataOpen && (
                <FloatingSheet
                    isOpen={true}
                    onClose={() => setIsDataOpen(false)}
                    title="Data Tables"
                    position="right"
                    width="xl"
                    height="full"
                    closeOnBackdropClick={true}
                    closeOnEsc={true}
                    showCloseButton={true}
                >
                    <QuickDataSheet onClose={() => setIsDataOpen(false)} />
                </FloatingSheet>
            )}

            {/* Files Sheet */}
            {isFilesOpen && (
                <FloatingSheet
                    isOpen={true}
                    onClose={() => setIsFilesOpen(false)}
                    title=""
                    position="right"
                    width="xl"
                    height="full"
                    closeOnBackdropClick={true}
                    closeOnEsc={true}
                    showCloseButton={false}
                    contentClassName="p-0"
                >
                    <QuickFilesSheet onClose={() => setIsFilesOpen(false)} />
                </FloatingSheet>
            )}

            {/* Utilities Hub Overlay */}
            {isUtilitiesOpen && (
                <UtilitiesOverlay
                    isOpen={true}
                    onClose={() => setIsUtilitiesOpen(false)}
                />
            )}
        </>
    );
}

