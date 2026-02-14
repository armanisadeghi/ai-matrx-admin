// app/(public)/p/chat/page.tsx
'use client';

import ChatContainer from '@/features/public-chat/components/ChatContainer';

/**
 * Public Chat Page — new conversation.
 * ChatProvider is at the layout level. This is a thin shell.
 */
export default function PublicChatPage() {
    return (
        <div className="h-full w-full bg-textured">
            <ChatContainer className="h-full" />
        </div>
    );
}
