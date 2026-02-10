'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { ChatSidebar } from '@/features/public-chat/components/ChatSidebar';

/**
 * ChatLayoutShell - Client component that provides sidebar + routing for the chat.
 *
 * Manages:
 * - Sidebar with chat history (from cx_ tables)
 * - Navigation between new chat and existing conversations
 * - Active request ID derived from the URL
 */
export default function ChatLayoutShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    // Derive active request ID from URL
    const activeRequestId = useMemo(() => {
        const match = pathname.match(/\/p\/chat\/([^/?]+)/);
        return match ? match[1] : null;
    }, [pathname]);

    const handleSelectChat = useCallback((requestId: string) => {
        router.push(`/p/chat/${requestId}`);
    }, [router]);

    const handleNewChat = useCallback(() => {
        router.push('/p/chat');
    }, [router]);

    return (
        <div className="h-full w-full relative">
            <ChatSidebar
                activeRequestId={activeRequestId}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
            />
            {children}
        </div>
    );
}
