'use client';

import { PanelLeft, SquarePen, ChevronDown } from 'lucide-react';
import type { AgentConfig } from '../../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface SidebarAgentHeaderProps {
    selectedAgent?: AgentConfig | null;
    onAgentSelect?: (agent: AgentConfig) => void;
    onCollapse?: () => void;
    onNewChat?: () => void;
}

// ============================================================================
// SIDEBAR AGENT HEADER
// Top row of the sidebar with collapse, new chat, and agent picker controls.
// These match the header's left group exactly so they appear in the same
// visual position when the sidebar opens.
// ============================================================================

export function SidebarAgentHeader({ selectedAgent, onAgentSelect, onCollapse, onNewChat }: SidebarAgentHeaderProps) {
    const displayName = selectedAgent?.name || 'General Chat';

    const handleAgentClick = () => {
        onAgentSelect?.(selectedAgent || { promptId: '', name: '' });
    };

    return (
        <div className="flex items-center gap-0.5 h-10 px-1.5 flex-shrink-0">
            {/* Collapse sidebar */}
            <button
                onClick={onCollapse}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
                title="Close sidebar"
            >
                <PanelLeft className="h-[18px] w-[18px]" />
            </button>
            {/* New chat */}
            <button
                onClick={onNewChat}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
                title="New chat"
            >
                <SquarePen className="h-[18px] w-[18px]" />
            </button>
            {/* Agent name — opens unified picker */}
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
