'use client';

// ChatHeaderControls — Desktop-only share button for the SSR chat route.
//
// The mobile header bar (hamburger, agent name, new chat) is now handled by
// ChatMobileHeaderBar — a pure server component that renders on first paint
// with zero client JS. This component ONLY handles the desktop share button.
//
// Injects via PageHeaderPortal into #shell-header-center on desktop (lg+).
// On mobile, this component renders nothing (the mobile bar is separate).

import { Share2 } from 'lucide-react';
import PageHeaderPortal from '@/app/(ssr)/_components/PageHeaderPortal';
import IconButton from '@/app/(ssr)/_components/IconButton';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';

interface ChatHeaderControlsProps {
    agentName: string;
    headerLabel: string;
    isConversation: boolean;
    isAuthenticated: boolean;
    dbConversationId?: string | null;
    selectedAgent?: AgentConfig | null;
    onAgentSelect: (agent: AgentConfig) => void;
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

    // Mobile: nothing — ChatMobileHeaderBar handles mobile (server-rendered, instant).
    // Desktop: share button when in a conversation.
    if (!showShare) return null;

    return (
        <PageHeaderPortal>
            {/* Desktop share button — right-aligned */}
            <div className="hidden lg:flex items-center justify-end w-full">
                <IconButton
                    icon={<Share2 />}
                    onClick={onShare!}
                    label="Share conversation"
                />
            </div>
        </PageHeaderPortal>
    );
}
