'use client';

import { PanelLeft, SquarePen, ChevronDown } from 'lucide-react';
import { TapTargetButton } from '@/app/(ssr)/_components/core/TapTargetButton';
import type { AgentConfig } from '../../context/DEPRECATED-ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface SidebarAgentHeaderProps {
    selectedAgent?: AgentConfig | null;
    onAgentSelect?: (agent: AgentConfig) => void;
    onCollapse?: () => void;
    onNewChat?: () => void;
    /** The URL that "New chat" navigates to — used for Cmd+click new tab */
    newChatHref?: string;
}

// ============================================================================
// SIDEBAR AGENT HEADER
// Top row of the sidebar with collapse, new chat, and agent picker controls.
// These match the header's left group exactly so they appear in the same
// visual position when the sidebar opens.
// ============================================================================

export function SidebarAgentHeader({ selectedAgent, onAgentSelect, onCollapse, onNewChat, newChatHref = '/ssr/chat' }: SidebarAgentHeaderProps) {
    const displayName = selectedAgent?.name || 'General Chat';

    const handleNewChatClick = (e: React.MouseEvent) => {
        if (e.metaKey || e.ctrlKey) {
            window.open(newChatHref, '_blank');
            return;
        }
        onNewChat?.();
    };

    const handleAgentClick = (e: React.MouseEvent) => {
        if (e.metaKey || e.ctrlKey) {
            window.open(newChatHref, '_blank');
            return;
        }
        onAgentSelect?.(selectedAgent || { promptId: '', name: '' });
    };

    return (
        <div className="flex items-center flex-shrink-0">
            {/* Collapse sidebar */}
            <TapTargetButton
                onClick={onCollapse}
                ariaLabel="Close sidebar"
                icon={<PanelLeft className="h-[18px] w-[18px] text-muted-foreground" />}
            />
            {/* New chat — Cmd+click opens in new tab */}
            <TapTargetButton
                onClick={handleNewChatClick}
                ariaLabel="New chat"
                icon={<SquarePen className="h-[18px] w-[18px] text-muted-foreground" />}
            />
            {/* Agent name — opens unified picker. Cmd+click opens new chat tab */}
            <button
                onClick={handleAgentClick}
                className="flex items-center gap-1 min-w-0 px-1.5 py-1 rounded-md hover:bg-accent/50 transition-colors"
                title={`Switch agent: ${displayName}`}
            >
                <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
                    {displayName}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </button>
        </div>
    );
}

export default SidebarAgentHeader;
