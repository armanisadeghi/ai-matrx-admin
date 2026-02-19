'use client';

import { TopicProvider } from '@/features/research/context/ResearchContext';
import ResearchLayoutShell from '@/features/research/components/shell/ResearchLayoutShell';
import type { ReactNode } from 'react';

interface ResearchTopicShellProps {
    topicId: string;
    children: ReactNode;
}

export default function ResearchTopicShell({ topicId, children }: ResearchTopicShellProps) {
    return (
        <TopicProvider topicId={topicId}>
            <ResearchLayoutShell topicId={topicId}>
                {children}
            </ResearchLayoutShell>
        </TopicProvider>
    );
}
