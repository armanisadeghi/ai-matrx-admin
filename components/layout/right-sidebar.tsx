// components/layout/right-sidebar.tsx
'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RightSidebarProps {
    available: boolean;
    state: 'closed' | 'full';
}

const RightSidebar: React.FC<RightSidebarProps> = ({ available, state }) => {
    if (!available || state === 'closed') return null;

    return (
        <aside className="w-64 border-l bg-background">
            <ScrollArea className="h-full">
                <div className="p-4">
                    <h2 className="text-lg font-semibold mb-4">Assistant</h2>
                    <p>This is where your AI assistant or helpful information can go.</p>
                </div>
            </ScrollArea>
        </aside>
    );
};

export default RightSidebar;
