"use client";

import React, { useState } from 'react';
import FullScreenOverlay, { TabDefinition } from '@/components/official/FullScreenOverlay';
import { NotesLayout } from '@/features/notes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StickyNote, CheckSquare, FileText, Folder, ExternalLink } from 'lucide-react';

interface UtilitiesOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'notes' | 'tasks' | 'files'; // Add more as needed
}

export function UtilitiesOverlay({ isOpen, onClose, initialTab = 'notes' }: UtilitiesOverlayProps) {
    const [activeTab, setActiveTab] = useState(initialTab);

    const tabs: TabDefinition[] = [
        {
            id: 'notes',
            label: (
                <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    <span>Notes</span>
                </div>
            ) as any,
            content: (
                <div className="h-full">
                    <NotesLayout />
                </div>
            ),
        },
        // Future tabs - uncomment when ready
        // {
        //     id: 'tasks',
        //     label: (
        //         <div className="flex items-center gap-2">
        //             <CheckSquare className="h-4 w-4" />
        //             <span>Tasks</span>
        //         </div>
        //     ) as any,
        //     content: (
        //         <div className="h-full p-6">
        //             <p className="text-zinc-500 dark:text-zinc-400">Tasks coming soon...</p>
        //         </div>
        //     ),
        // },
        // {
        //     id: 'files',
        //     label: (
        //         <div className="flex items-center gap-2">
        //             <Folder className="h-4 w-4" />
        //             <span>Files</span>
        //         </div>
        //     ) as any,
        //     content: (
        //         <div className="h-full p-6">
        //             <p className="text-zinc-500 dark:text-zinc-400">Files coming soon...</p>
        //         </div>
        //     ),
        // },
    ];

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title="Utilities"
            description="Quick access to notes, tasks, files and more"
            tabs={tabs}
            initialTab={initialTab}
            onTabChange={(tab) => setActiveTab(tab as typeof initialTab)}
            width="95vw"
            height="95vh"
            sharedHeader={
                activeTab === 'notes' ? (
                    <div className="flex items-center justify-end">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2"
                                        onClick={() => window.open('/notes', '_blank')}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        <span className="text-xs">Open in New Tab</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open Notes in dedicated tab</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                ) : undefined
            }
        />
    );
}

