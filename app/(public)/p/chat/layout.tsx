// app/(public)/p/chat/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Chat | AI Matrx',
    description: 'Chat with AI assistants powered by Matrx Superpowers. Experience intelligent conversations with various specialized agents.',
    openGraph: {
        title: 'Chat | AI Matrx',
        description: 'Chat with AI assistants powered by Matrx Superpowers',
    },
};

/**
 * Chat Layout
 * 
 * Redux (LiteStoreProvider) is now available from PublicProviders in the parent layout.
 * No additional providers needed here.
 */
export default function PublicChatLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
