// app/(public)/p/chat/a/[id]/page.tsx
'use client';

import ChatContainer from '@/features/public-chat/components/ChatContainer';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';
import { useLayoutAgent } from '../../ChatLayoutShell';

/**
 * Agent-Direct Route — opens an empty chat with a specific agent pre-selected.
 *
 * Route: /p/chat/a/[id]
 *
 * The agent is resolved by ChatLayoutShell from the URL on initial load.
 * This page just reads the layout context — no sync effects needed.
 * All agent state is managed by the layout shell.
 */
export default function AgentPage() {
    const { selectedAgent } = useLayoutAgent();

    return (
        <ChatProvider initialAgent={selectedAgent}>
            <div className="h-full w-full bg-textured">
                <ChatContainer className="h-full" />
            </div>
        </ChatProvider>
    );
}
