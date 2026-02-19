'use client';

import { ResearchSidebar } from './ResearchSidebar';
import { ResearchMobileNav } from './ResearchMobileNav';
import type { ReactNode } from 'react';

interface ResearchLayoutShellProps {
    topicId: string;
    children: ReactNode;
}

export default function ResearchLayoutShell({ topicId, children }: ResearchLayoutShellProps) {
    return (
        <div className="h-full flex overflow-hidden">
            <ResearchSidebar topicId={topicId} />
            <main className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
                {children}
            </main>
            <ResearchMobileNav topicId={topicId} />
        </div>
    );
}
