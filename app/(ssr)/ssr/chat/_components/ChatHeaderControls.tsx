'use client';

// ChatHeaderControls — Injects only the Share button into the shell header (right side).
// Sidebar toggle, new chat, and agent controls live inside ChatSidebarClient.
// Uses the canonical shell IconButton so the share icon is pixel-identical to
// every other button in the shell header (same .icon-btn tap target, same
// .icon-btn-glass shell-glass shell-tactile glass pill).

import { Share2 } from 'lucide-react';
import PageHeader from '@/app/(ssr)/_components/PageHeader';
import IconButton from '@/app/(ssr)/_components/IconButton';

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
            <IconButton
                icon={<Share2 />}
                onClick={onShare}
                label="Share conversation"
            />
        </div>
    );

    return <PageHeader>{shareButton}</PageHeader>;
}
