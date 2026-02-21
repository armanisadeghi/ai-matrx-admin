import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AgentsProvider } from '@/features/public-chat/context/AgentsContext';
import ChatLayoutShell from './ChatLayoutShell';
import ChatLoading from './loading';

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
            <Suspense fallback={<ChatLoading />}>
                <ChatLayoutShell>{children}</ChatLayoutShell>
            </Suspense>
        </AgentsProvider>
    );
}
