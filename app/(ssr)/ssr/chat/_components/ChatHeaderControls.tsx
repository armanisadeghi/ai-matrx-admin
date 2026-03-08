'use client';

// ChatHeaderControls — Injects content into the shell header for the SSR chat route.
//
// SINGLE injection with internal responsive layout:
//   - Mobile (< lg): hamburger | agent-name+chevron | new-chat
//   - Desktop (lg+): share icon (only in conversation mode, on the right)
//
// We use ONE shell-header-inject div with internal flex to avoid the
// CSS specificity conflict between .shell-header-inject { display:flex }
// and Tailwind .hidden — same specificity, last-declared wins, grid breaks.
//
// The shell's default hamburger is hidden on /ssr/chat via CSS
// (.shell-root[data-pathname^="/ssr/chat"] .shell-mobile-trigger { display:none })
// so the mobile hamburger here seamlessly takes its place.

import { Share2, SquarePen, ChevronDown, Menu } from 'lucide-react';
import PageHeaderPortal from '@/app/(ssr)/_components/PageHeaderPortal';
import IconButton from '@/app/(ssr)/_components/IconButton';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';
import { useChatSidebar } from './ChatSidebarContext';
import { useSsrAgent } from './SsrAgentContext';

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
    onNewChat,
}: ChatHeaderControlsProps) {
    const { toggle } = useChatSidebar();
    const { selectedAgent, openAgentPicker } = useSsrAgent();

    const showShare = isAuthenticated && isConversation && !!dbConversationId && !!onShare;

    return (
        <PageHeaderPortal>
            {/*
              Single inject div. Uses flex with between alignment.
              Left zone: hamburger on mobile (hidden on desktop)
              Center zone: agent name on mobile (hidden on desktop)
              Right zone: new-chat on mobile (hidden on desktop) | share on desktop (hidden on mobile)
            */}
            <div className="flex items-center w-full h-full">
                {/* ── Hamburger — mobile only ── */}
                <div className="flex lg:hidden">
                    <IconButton
                        icon={<Menu />}
                        onClick={toggle}
                        label="Open chat menu"
                    />
                </div>

                {/* ── Agent name picker — mobile only, fills flexible center ── */}
                <button
                    onClick={openAgentPicker}
                    className="flex lg:hidden flex-1 items-center justify-center gap-1 min-w-0 px-2 py-1 rounded-lg text-sm font-medium text-foreground/90 hover:text-foreground active:text-foreground transition-colors select-none"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <span className="truncate max-w-[180px]">{selectedAgent?.name || 'General Chat'}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </button>

                {/* ── Mobile new-chat + Desktop share — share icon right-aligned on desktop ── */}
                <div className="flex items-center ml-auto">
                    {/* New chat — mobile only */}
                    <div className="flex lg:hidden">
                        <IconButton
                            icon={<SquarePen />}
                            onClick={onNewChat}
                            label="New chat"
                        />
                    </div>

                    {/* Share — desktop only, in conversation mode */}
                    {showShare && (
                        <div className="hidden lg:flex">
                            <IconButton
                                icon={<Share2 />}
                                onClick={onShare!}
                                label="Share conversation"
                            />
                        </div>
                    )}
                </div>
            </div>
        </PageHeaderPortal>
    );
}
