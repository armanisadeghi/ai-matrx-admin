// app/(ssr)/ssr/chat/page.tsx
//
// Server component — renders the welcome screen with General Chat pre-selected.
// No database calls. Hardcoded agent data for instant SSR.
// The client island (ChatWelcomeClient) hydrates interactivity after paint.

import ChatWelcomeServer from './_components/ChatWelcomeServer';
import ChatHeaderControls from './_components/ChatHeaderControls';
import { GENERAL_CHAT_AGENT } from './_lib/agents';
import { getChatAuth } from './_lib/auth';

export default async function ChatPage() {
    const auth = await getChatAuth();

    return (
        <>
            <ChatHeaderControls />
            <ChatWelcomeServer
                agent={GENERAL_CHAT_AGENT}
                isAuthenticated={auth.isAuthenticated}
                isAdmin={auth.isAdmin}
            />
        </>
    );
}
