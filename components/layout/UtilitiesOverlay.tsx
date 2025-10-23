"use client";

import React, { useState } from 'react';
import FullScreenOverlay, { TabDefinition } from '@/components/official/FullScreenOverlay';
import { NotesLayout } from '@/features/notes';
import { StickyNote, CheckSquare, FileText, Folder } from 'lucide-react';

interface UtilitiesOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'notes' | 'tasks' | 'files'; // Add more as needed
}

export function UtilitiesOverlay({ isOpen, onClose, initialTab = 'notes' }: UtilitiesOverlayProps) {
    const tabs: TabDefinition[] = [
        {
            id: 'notes',
            label: '📝 Notes',
            content: (
                <div className="h-full">
                    <NotesLayout />
                </div>
            ),
        },
        // Future tabs - uncomment when ready
        // {
        //     id: 'tasks',
        //     label: '✓ Tasks',
        //     content: (
        //         <div className="h-full p-6">
        //             <p className="text-zinc-500 dark:text-zinc-400">Tasks coming soon...</p>
        //         </div>
        //     ),
        // },
        // {
        //     id: 'files',
        //     label: '📁 Files',
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
            width="95vw"
            height="95vh"
        />
    );
}

