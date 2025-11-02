// features/quick-actions/components/QuickActionsMenu.tsx
"use client";

import React, { useState } from 'react';
import { StickyNote, Zap, LayoutGrid, CheckSquare, MessageSquare, Database } from 'lucide-react';
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
import { QuickNotesSheet } from '@/features/notes';
import { QuickTasksSheet } from '@/features/tasks';
import { QuickChatSheet } from './QuickChatSheet';
import { QuickDataSheet } from './QuickDataSheet';
import { UtilitiesOverlay } from './UtilitiesOverlay';

interface QuickActionsMenuProps {
    className?: string;
}

export function QuickActionsMenu({ className }: QuickActionsMenuProps) {
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isTasksOpen, setIsTasksOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isDataOpen, setIsDataOpen] = useState(false);
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

            {/* Notes Sheet */}
            <FloatingSheet
                isOpen={isNotesOpen}
                onClose={() => setIsNotesOpen(false)}
                title="Quick Notes"
                description="Quickly capture or retrieve notes without losing focus"
                position="right"
                width="xl"
                height="full"
                closeOnBackdropClick={true}
                closeOnEsc={true}
                showCloseButton={true}
            >
                <QuickNotesSheet onClose={() => setIsNotesOpen(false)} />
            </FloatingSheet>

            {/* Tasks Sheet */}
            <FloatingSheet
                isOpen={isTasksOpen}
                onClose={() => setIsTasksOpen(false)}
                title="Quick Tasks"
                description="Manage tasks and projects without losing context"
                position="right"
                width="xl"
                height="full"
                closeOnBackdropClick={true}
                closeOnEsc={true}
                showCloseButton={true}
            >
                <QuickTasksSheet onClose={() => setIsTasksOpen(false)} />
            </FloatingSheet>

            {/* Chat Sheet */}
            <FloatingSheet
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                position="right"
                width="xl"
                height="full"
                closeOnBackdropClick={true}
                closeOnEsc={true}
                showCloseButton={false}
            >
                <QuickChatSheet onClose={() => setIsChatOpen(false)} />
            </FloatingSheet>

            {/* Data Sheet */}
            <FloatingSheet
                isOpen={isDataOpen}
                onClose={() => setIsDataOpen(false)}
                title="Data Tables"
                description="View and manage your data tables"
                position="right"
                width="xl"
                height="full"
                closeOnBackdropClick={true}
                closeOnEsc={true}
                showCloseButton={true}
            >
                <QuickDataSheet onClose={() => setIsDataOpen(false)} />
            </FloatingSheet>

            {/* Utilities Hub Overlay */}
            <UtilitiesOverlay
                isOpen={isUtilitiesOpen}
                onClose={() => setIsUtilitiesOpen(false)}
            />
        </>
    );
}

