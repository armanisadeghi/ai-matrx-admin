// app/(public)/p/chat/c/[id]/page.tsx
'use client';

import ChatContainer from '@/features/public-chat/components/ChatContainer';

/**
 * Conversation-Direct Route — loads an existing conversation by ID.
 * Route: /p/chat/c/[id]
 * Optional: ?agent=[agentId] — preserves the agent context in the UI.
 *
 * Conversation loading is handled by ChatLayoutShell (URL-driven).
 * This is a thin shell — ChatProvider lives at the layout level.
 */
export default function ConversationPage() {
    return (
        <div className="h-full w-full bg-textured">
            <ChatContainer className="h-full" />
        </div>
    );
}
