// features/quick-actions/components/UtilitiesOverlay.tsx
"use client";

import React, { useState } from 'react';
import FullScreenOverlay, { TabDefinition } from '@/components/official/FullScreenOverlay';
import { NotesLayout } from '@/features/notes';
import TaskApp from '@/features/tasks/components/TaskApp';
import { QuickChatSheet } from './QuickChatSheet';
import { QuickDataSheet } from './QuickDataSheet';
import { QuickFilesSheet } from './QuickFilesSheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StickyNote, CheckSquare, MessageSquare, Database, FolderOpen, ExternalLink } from 'lucide-react';

interface UtilitiesOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'notes' | 'tasks' | 'chat' | 'data' | 'files';
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
        {
            id: 'tasks',
            label: (
                <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    <span>Tasks</span>
                </div>
            ) as any,
            content: (
                <div className="h-full">
                    <TaskApp />
                </div>
            ),
        },
        {
            id: 'chat',
            label: (
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat</span>
                </div>
            ) as any,
            content: (
                <div className="h-full">
                    <QuickChatSheet />
                </div>
            ),
        },
        {
            id: 'data',
            label: (
                <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Data</span>
                </div>
            ) as any,
            content: (
                <div className="h-full">
                    <QuickDataSheet />
                </div>
            ),
        },
        {
            id: 'files',
            label: (
                <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    <span>Files</span>
                </div>
            ) as any,
            content: (
                <div className="h-full">
                    <QuickFilesSheet hideHeader />
                </div>
            ),
        },
    ];

    // Get the route based on active tab
    const getRouteForTab = () => {
        switch (activeTab) {
            case 'notes':
                return '/notes';
            case 'tasks':
                return '/tasks';
            case 'data':
                return '/data';
            case 'files':
                return '/files';
            default:
                return null;
        }
    };

    const route = getRouteForTab();

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title="Utilities"
            description="Quick access to notes, tasks, chat, data and more"
            tabs={tabs}
            initialTab={initialTab}
            onTabChange={(tab) => setActiveTab(tab as typeof initialTab)}
            width="95vw"
            height="95vh"
            sharedHeader={
                route ? (
                    <div className="flex items-center justify-end">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2"
                                        onClick={() => window.open(route, '_blank')}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        <span className="text-xs">Open in New Tab</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open {activeTab} in dedicated tab</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                ) : undefined
            }
        />
    );
}

