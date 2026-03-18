'use client';

// ChatHeaderControls — Desktop header controls for the SSR chat route.
//
// Injects via PageHeaderPortal into #shell-header-center on desktop (lg+).
// On mobile, this component renders nothing (the mobile bar is separate).
//
// Features:
//   - Admin-only: localhost toggle + block mode toggle
//   - Share button when in a conversation

import { Share2, Blocks } from 'lucide-react';
import PageHeaderPortal from '@/app/(ssr)/_components/PageHeaderPortal';
import IconButton from '@/app/(ssr)/_components/IconButton';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectIsAdmin } from '@/lib/redux/slices/userSlice';
import { useChatContext } from '@/features/public-chat/context/ChatContext';
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
    const isAdmin = useAppSelector(selectIsAdmin);
    const { state, setUseLocalhost, setUseBlockMode } = useChatContext();

    const showShare = isAuthenticated && isConversation && !!dbConversationId && !!onShare;
    const showAdminToggles = isAdmin;

    if (!showShare && !showAdminToggles) return null;

    return (
        <PageHeaderPortal>
            <div className="hidden lg:flex items-center justify-end w-full gap-1">
                {/* Admin-only toggles */}
                {showAdminToggles && (
                    <>
                        <button
                            onClick={() => setUseLocalhost(!state.useLocalhost)}
                            title={state.useLocalhost ? 'Using localhost — click to switch to production' : 'Using production — click to switch to localhost'}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                                state.useLocalhost
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                                    : 'text-muted-foreground/50 hover:text-muted-foreground border border-transparent hover:border-border'
                            }`}
                        >
                            local
                        </button>
                        <button
                            onClick={() => setUseBlockMode(!state.useBlockMode)}
                            title={state.useBlockMode ? 'Block mode ON — click to disable.' : 'Block mode OFF — click to enable.'}
                            className={`p-1.5 rounded-md transition-colors ${
                                state.useBlockMode
                                    ? 'text-violet-600 dark:text-violet-400 bg-violet-500/15 border border-violet-500/30'
                                    : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 border border-transparent'
                            }`}
                        >
                            <Blocks className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}

                {/* Share button */}
                {showShare && (
                    <IconButton
                        icon={<Share2 />}
                        onClick={onShare!}
                        label="Share conversation"
                    />
                )}
            </div>
        </PageHeaderPortal>
    );
}
