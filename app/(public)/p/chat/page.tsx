// app/(public)/p/chat/page.tsx
// Server Component shell — renders instantly.
// ChatContainer lazy-loads after hydration.

import { Suspense, lazy } from 'react';

const ChatContainer = lazy(() => import('@/features/public-chat/components/ChatContainer'));

/**
 * Public Chat Page — new conversation.
 * ChatProvider is at the layout level. This is a thin SSR shell.
 */
export default function PublicChatPage() {
    return (
        <div className="h-full w-full bg-textured">
            <Suspense fallback={<div className="h-full w-full bg-textured" />}>
                <ChatContainer className="h-full" />
            </Suspense>
        </div>
    );
}
