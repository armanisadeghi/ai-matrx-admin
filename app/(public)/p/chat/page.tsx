// app/(public)/p/chat/page.tsx
'use client';

import ChatContainer from '@/features/public-chat/components/ChatContainer';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';
import { useLayoutAgent } from './ChatLayoutShell';

/**
 * Public Chat Page
 * 
 * Redux (LiteStoreProvider) available from PublicProviders in the public layout.
 * Lightweight store - no entities/socket/sagas.
 * 
 * Uses `useLayoutAgent()` to read the selected agent from ChatLayoutShell
 * so that sidebar agent selection and "New Chat" properly initialize.
 */
export default function PublicChatPage() {
    const agent = useLayoutAgent();

    return (
        <ChatProvider initialAgent={agent}>
            <div className="h-full w-full bg-textured">
                <ChatContainer className="h-full" />
            </div>
        </ChatProvider>
    );
}
