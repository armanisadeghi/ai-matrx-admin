'use client';

import { ChevronDown, Bot } from 'lucide-react';
import { DEFAULT_AGENTS } from '../AgentSelector';
import type { AgentConfig } from '../../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface SidebarAgentHeaderProps {
    selectedAgent?: AgentConfig | null;
    onAgentSelect?: (agent: AgentConfig) => void;
    /** When true, renders as a fixed-position button for when sidebar is closed */
    floating?: boolean;
    /** When true, renders compact without sidebar padding/border (for mobile sub-header) */
    compact?: boolean;
}

// ============================================================================
// SIDEBAR AGENT HEADER — Trigger button only, opens AgentPickerSheet
// ============================================================================

export function SidebarAgentHeader({ selectedAgent, onAgentSelect, floating, compact }: SidebarAgentHeaderProps) {
    const displayName = selectedAgent?.name || 'General Chat';
    const currentIcon = DEFAULT_AGENTS.find(a => a.promptId === selectedAgent?.promptId)?.icon;

    const handleClick = () => {
        onAgentSelect?.(selectedAgent || { promptId: '', name: '' });
    };

    // Floating mode — fixed-position pill visible when sidebar is closed
    if (floating) {
        return (
            <button
                onClick={handleClick}
                className="fixed top-[3rem] left-14 z-50 flex items-center gap-2 h-8 text-muted-foreground hover:text-foreground transition-colors"
                title={displayName ? `Switch agent: ${displayName}` : 'Switch agent'}
            >
                <span className="text-[11px] font-medium max-w-[240px] truncate" title={displayName}>
                    {displayName}
                </span>
                <ChevronDown className="h-2.5 w-2.5 flex-shrink-0" />
            </button>
        );
    }

    // Inline mode — inside sidebar header (default) or mobile sub-header (compact)
    return (
        <div className={compact ? 'flex items-center' : 'flex items-center pl-11 pr-2 py-2 border-b border-border'}>
            <button 
                onClick={handleClick}
                className="flex items-center gap-3 h-8 rounded-md hover:bg-accent/50 transition-colors min-w-0 group"
            >
                <span className="text-xs font-medium text-foreground truncate max-w-[180px]" title={displayName}>
                    {displayName}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </button>
        </div>
    );
}

export default SidebarAgentHeader;
