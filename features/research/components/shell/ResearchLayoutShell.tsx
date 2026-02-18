'use client';

import { ResearchSidebar } from './ResearchSidebar';
import { ResearchMobileNav } from './ResearchMobileNav';
import type { ReactNode } from 'react';

interface ResearchLayoutShellProps {
    projectId: string;
    children: ReactNode;
}

export default function ResearchLayoutShell({ projectId, children }: ResearchLayoutShellProps) {
    return (
        <div className="h-full flex overflow-hidden">
            <ResearchSidebar projectId={projectId} />
            <main className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
                {children}
            </main>
            <ResearchMobileNav projectId={projectId} />
        </div>
    );
}
