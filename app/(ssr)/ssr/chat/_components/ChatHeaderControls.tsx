'use client';

// ChatHeaderControls — Injected into the shell header center slot via PageHeader.
// Desktop: sidebar toggle + agent pill + new chat + share
// Mobile: sidebar toggle + agent name + new chat

import { useCallback, useState } from 'react';
import { PanelLeft, SquarePen, Share2, MessageCircle, ChevronDown } from 'lucide-react';
import PageHeader from '@/app/(ssr)/_components/PageHeader';
import { AgentPickerSheet } from '@/features/public-chat/components/AgentPickerSheet';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';
import { useChatSidebar } from './ChatSidebarContext';

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
    agentName,
    headerLabel,
    isConversation,
    isAuthenticated,
    dbConversationId,
    selectedAgent,
    onAgentSelect,
    onNewChat,
    onShare,
}: ChatHeaderControlsProps) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const { toggle } = useChatSidebar();

    const handleAgentSelect = useCallback((agent: AgentConfig) => {
        onAgentSelect(agent);
        setPickerOpen(false);
    }, [onAgentSelect]);

    // Desktop header: sidebar toggle + agent pill + new chat + share
    const desktopContent = (
        <div className="flex items-center gap-1.5 w-full justify-between">
            <div className="flex items-center gap-1.5">
                {/* Toggle chat sidebar */}
                <button
                    onClick={toggle}
                    className="shell-glass shell-tactile flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full text-(--shell-nav-icon) hover:text-(--shell-nav-text-hover) cursor-pointer [&_svg]:w-3.5 [&_svg]:h-3.5"
                    title="Toggle chat sidebar"
                >
                    <PanelLeft />
                </button>

                {/* New chat */}
                <button
                    onClick={onNewChat}
                    className="shell-glass shell-tactile flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full text-(--shell-nav-icon) hover:text-(--shell-nav-text-hover) cursor-pointer [&_svg]:w-3.5 [&_svg]:h-3.5"
                    title="New chat"
                >
                    <SquarePen />
                </button>
            </div>

            <div className="flex items-center gap-1.5">
                {/* Agent pill — shows current agent or conversation snippet */}
                <button
                    onClick={() => setPickerOpen(true)}
                    className="shell-glass shell-tactile flex items-center gap-1.5 h-[1.875rem] px-3 rounded-full text-[0.6875rem] font-medium text-(--shell-nav-text-hover) max-w-[280px] cursor-pointer"
                    title="Change agent"
                >
                    <MessageCircle className="w-3 h-3 shrink-0 text-(--shell-nav-icon)" />
                    <span className="truncate">{headerLabel}</span>
                    <ChevronDown className="w-3 h-3 shrink-0 text-(--shell-nav-icon)" />
                </button>

                {/* Share */}
                {isAuthenticated && isConversation && dbConversationId && onShare && (
                    <button
                        onClick={onShare}
                        className="shell-glass shell-tactile flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full text-(--shell-nav-icon) hover:text-(--shell-nav-text-hover) cursor-pointer [&_svg]:w-3.5 [&_svg]:h-3.5"
                        title="Share conversation"
                    >
                        <Share2 />
                    </button>
                )}
            </div>
        </div>
    );

    // Mobile header: sidebar toggle + agent name (truncated) + new chat
    const mobileContent = (
        <div className="flex items-center gap-1 w-full justify-between">
            <div className="flex items-center gap-1">
                <button
                    onClick={toggle}
                    className="shell-glass shell-tactile flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full text-(--shell-nav-icon) hover:text-(--shell-nav-text-hover) cursor-pointer [&_svg]:w-3.5 [&_svg]:h-3.5"
                    title="Toggle chat sidebar"
                >
                    <PanelLeft />
                </button>

                <button
                    onClick={onNewChat}
                    className="shell-glass shell-tactile flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full text-(--shell-nav-icon) hover:text-(--shell-nav-text-hover) cursor-pointer [&_svg]:w-3.5 [&_svg]:h-3.5"
                    title="New chat"
                >
                    <SquarePen />
                </button>
            </div>

            <button
                onClick={() => setPickerOpen(true)}
                className="shell-glass shell-tactile flex items-center gap-1 h-[1.625rem] px-2.5 rounded-full text-[0.625rem] font-medium text-(--shell-nav-text-hover) max-w-[180px] cursor-pointer"
                title="Change agent"
            >
                <span className="truncate">{isConversation ? headerLabel : agentName}</span>
                <ChevronDown className="w-2.5 h-2.5 shrink-0 text-(--shell-nav-icon)" />
            </button>

            <div className="w-[1.875rem]" />
        </div>
    );

    return (
        <>
            <PageHeader desktop={desktopContent} mobile={mobileContent} />
            <AgentPickerSheet
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                selectedAgent={selectedAgent}
                onSelect={handleAgentSelect}
            />
        </>
    );
}
