// app/(public)/p/chat/layout.tsx
import type { Metadata } from 'next';
import ChatLayoutShell from './ChatLayoutShell';

export const metadata: Metadata = {
    title: 'Chat | AI Matrx',
    description: 'Chat with AI assistants powered by Matrx Superpowers. Experience intelligent conversations with various specialized agents.',
    openGraph: {
        title: 'Chat | AI Matrx',
        description: 'Chat with AI assistants powered by Matrx Superpowers',
    },
};

/**
 * Chat Layout - Server Component
 *
 * Provides metadata. ChatLayoutShell is a client component
 * that manages the sidebar and routing state.
 */
export default function PublicChatLayout({ children }: { children: React.ReactNode }) {
    return <ChatLayoutShell>{children}</ChatLayoutShell>;
}
