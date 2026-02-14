// app/(public)/p/chat/a/[id]/page.tsx
'use client';

import ChatContainer from '@/features/public-chat/components/ChatContainer';

/**
 * Agent-Direct Route — opens an empty chat with a specific agent pre-selected.
 * Route: /p/chat/a/[id]
 *
 * Agent resolution and state management happen in ChatLayoutShell.
 * This is a thin shell — ChatProvider lives at the layout level.
 */
export default function AgentPage() {
    return (
        <div className="h-full w-full bg-textured">
            <ChatContainer className="h-full" />
        </div>
    );
}
