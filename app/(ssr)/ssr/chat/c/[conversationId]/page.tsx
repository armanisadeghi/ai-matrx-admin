// app/(ssr)/ssr/chat/c/[conversationId]/page.tsx
//
// Conversation-direct route — /ssr/chat/c/[conversationId]
// Server component that:
//   1. Fires a server-side warm call to the Python backend
//   2. Renders the conversation skeleton (server HTML)
//   3. The ChatConversationClient island loads the actual conversation
//
// Supports conversationId="new" for first-message transitions from welcome.
// The client picks up the first message from sessionStorage.

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import ChatHeaderControls from '../../_components/ChatHeaderControls';
import { getChatAuth } from '../../_lib/auth';
import { ChatConversationSkeleton } from '../../_components/ChatConversationSkeleton';
import { BACKEND_URLS, ENDPOINTS } from '@/lib/api/endpoints';

// Dynamic import — conversation UI is never needed at initial SSR paint
const ChatConversationClient = dynamic(
    () => import('../../_components/ChatConversationClient'),
    {
        ssr: false,
        loading: () => <ChatConversationSkeleton />,
    },
);

export default async function ConversationPage({
    params,
    searchParams,
}: {
    params: Promise<{ conversationId: string }>;
    searchParams: Promise<{ agent?: string }>;
}) {
    const [{ conversationId }, resolvedSearchParams, auth] = await Promise.all([
        params,
        searchParams,
        getChatAuth(),
    ]);

    const agentId = resolvedSearchParams.agent;
    const isNew = conversationId === 'new';

    // Fire-and-forget: warm the conversation on the Python backend (skip for "new")
    if (!isNew) {
        const warmUrl = `${BACKEND_URLS.production}${ENDPOINTS.ai.conversationWarm(conversationId)}`;
        fetch(warmUrl, { method: 'POST' }).catch(() => {});
    }

    return (
        <>
            <ChatHeaderControls />
            <Suspense fallback={<ChatConversationSkeleton />}>
                <ChatConversationClient
                    conversationId={conversationId}
                    agentId={agentId}
                    isAuthenticated={auth.isAuthenticated}
                    isAdmin={auth.isAdmin}
                />
            </Suspense>
        </>
    );
}
