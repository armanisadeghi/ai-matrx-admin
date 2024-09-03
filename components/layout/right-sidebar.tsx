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
                    <h2 className="text-lg font-semibold mb-4">AI Matrx</h2>
                    <p>Hi. I'm here to assist you whatever you need. As you work, I'll watch and try to help, if I can but if it's too much, just click the button above and I'll go take a nap.</p>
                </div>
            </ScrollArea>
        </aside>
    );
};

export default RightSidebar;
