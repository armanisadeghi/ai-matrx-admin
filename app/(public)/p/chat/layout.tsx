// app/(public)/p/chat/layout.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AgentsProvider } from '@/features/public-chat/context/AgentsContext';
import ChatLayoutShell from './ChatLayoutShell';

export const metadata: Metadata = {
    title: 'Chat | AI Matrx',
    description: 'Chat with AI assistants powered by Matrx Superpowers. Experience intelligent conversations with various specialized agents.',
    openGraph: {
        title: 'Chat | AI Matrx',
        description: 'Chat with AI assistants powered by Matrx Superpowers',
    },
};

export default function PublicChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <AgentsProvider>
            <Suspense fallback={<div className="h-full w-full bg-textured" />}>
                <ChatLayoutShell>{children}</ChatLayoutShell>
            </Suspense>
        </AgentsProvider>
    );
}
