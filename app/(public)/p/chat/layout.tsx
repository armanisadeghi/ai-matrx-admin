// app/(public)/p/chat/layout.tsx
import type { Metadata } from 'next';
import { LiteProviders } from '@/app/LiteProviders';

export const metadata: Metadata = {
    title: 'Chat | AI Matrx',
    description: 'Chat with AI assistants powered by Matrx Superpowers. Experience intelligent conversations with various specialized agents.',
    openGraph: {
        title: 'Chat | AI Matrx',
        description: 'Chat with AI assistants powered by Matrx Superpowers',
    },
};

/**
 * Chat Layout - Uses LiteProviders (lightweight Redux without entities/socket/sagas)
 */
export default function PublicChatLayout({ children }: { children: React.ReactNode }) {
    return <LiteProviders>{children}</LiteProviders>;
}
