import { Suspense } from 'react';
import ChatContainer from '@/features/public-chat/components/ChatContainer';
import ChatLoading from '../../loading';

/**
 * Agent-Direct Route — /p/chat/a/[id]
 * Opens an empty chat with a specific agent pre-selected.
 * Agent resolution happens in ChatLayoutShell.
 */
export default function AgentPage() {
    return (
        <div className="h-full w-full bg-textured">
            <Suspense fallback={<ChatLoading />}>
                <ChatContainer className="h-full" />
            </Suspense>
        </div>
    );
}
