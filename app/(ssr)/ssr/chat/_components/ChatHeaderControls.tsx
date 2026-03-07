'use client';

// ChatHeaderControls — Injects only the Share button into the shell header (right side).
// Sidebar toggle, new chat, and agent controls live inside ChatSidebarClient.

import { Share2 } from 'lucide-react';
import PageHeader from '@/app/(ssr)/_components/PageHeader';

interface ChatHeaderControlsProps {
    agentName: string;
    headerLabel: string;
    isConversation: boolean;
    isAuthenticated: boolean;
    dbConversationId?: string | null;
    selectedAgent?: null;
    onAgentSelect: (agent: unknown) => void;
    onNewChat: () => void;
    onShare?: () => void;
}

export default function ChatHeaderControls({
    isConversation,
    isAuthenticated,
    dbConversationId,
    onShare,
}: ChatHeaderControlsProps) {
    const showShare = isAuthenticated && isConversation && !!dbConversationId && !!onShare;

    if (!showShare) return null;

    const shareButton = (
        <div className="flex items-center justify-end w-full">
            <button
                onClick={onShare}
                className="shell-glass shell-tactile flex items-center justify-center pr-2 w-[1.875rem] h-[1.875rem] rounded-full text-(--shell-nav-icon) hover:text-(--shell-nav-text-hover) cursor-pointer [&_svg]:w-3.5 [&_svg]:h-3.5"
                title="Share conversation"
            >
                <Share2 />
            </button>
        </div>
    );

    return <PageHeader>{shareButton}</PageHeader>;
}
