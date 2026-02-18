'use client';

import { ResearchProvider } from '@/features/research/context/ResearchContext';
import ResearchLayoutShell from '@/features/research/components/shell/ResearchLayoutShell';
import type { ReactNode } from 'react';

interface ResearchProjectShellProps {
    projectId: string;
    children: ReactNode;
}

export default function ResearchProjectShell({ projectId, children }: ResearchProjectShellProps) {
    return (
        <ResearchProvider projectId={projectId}>
            <ResearchLayoutShell projectId={projectId}>
                {children}
            </ResearchLayoutShell>
        </ResearchProvider>
    );
}
