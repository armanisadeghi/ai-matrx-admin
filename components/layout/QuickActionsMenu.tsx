// components/layout/QuickActionsMenu.tsx
"use client";

import React, { useState } from 'react';
import { StickyNote, Zap, LayoutGrid } from 'lucide-react';
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
import { UtilitiesOverlay } from './UtilitiesOverlay';

interface QuickActionsMenuProps {
    className?: string;
}

export function QuickActionsMenu({ className }: QuickActionsMenuProps) {
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isUtilitiesOpen, setIsUtilitiesOpen] = useState(false);
    // Add more states here as you add more quick actions:
    // const [isTasksOpen, setIsTasksOpen] = useState(false);

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

                            {/* Add more quick actions here as you build them:
                            
                            <DropdownMenuItem
                                onClick={() => setIsTasksOpen(true)}
                                className="cursor-pointer"
                            >
                                <CheckSquare className="h-4 w-4 mr-2" />
                                <div className="flex flex-col">
                                    <span>Tasks</span>
                                    <span className="text-xs text-zinc-500">Quick task management</span>
                                </div>
                            </DropdownMenuItem>
                            
                            */}
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

            {/* Utilities Hub Overlay */}
            <UtilitiesOverlay
                isOpen={isUtilitiesOpen}
                onClose={() => setIsUtilitiesOpen(false)}
            />

            {/* Add more sheets here as you add more quick actions:
            
            <FloatingSheet
                isOpen={isTasksOpen}
                onClose={() => setIsTasksOpen(false)}
                title="Quick Tasks"
                position="right"
                width="xl"
                height="full"
            >
                <QuickTasksSheet onClose={() => setIsTasksOpen(false)} />
            </FloatingSheet>
            
            */}
        </>
    );
}

