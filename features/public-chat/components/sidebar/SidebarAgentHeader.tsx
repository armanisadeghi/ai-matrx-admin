'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Bot, Search, Sparkles } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/redux/slices/userSlice';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgentsContext } from '../../context/AgentsContext';
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
// AGENT PICKER CONTENT — shared between inline and floating
// ============================================================================

function AgentPickerContent({
    selectedAgent,
    onSelect,
}: {
    selectedAgent?: AgentConfig | null;
    onSelect: (agent: AgentConfig) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const user = useSelector(selectUser);
    const isAuthenticated = !!user?.id;
    const { userPrompts } = useAgentsContext();

    // System agents filtered
    const filteredSystem = useMemo(() => {
        if (!searchQuery.trim()) return DEFAULT_AGENTS;
        const q = searchQuery.toLowerCase();
        return DEFAULT_AGENTS.filter(a =>
            a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    // User agents filtered
    const filteredUser = useMemo(() => {
        const mapped = userPrompts.map(p => ({
            id: p.id,
            promptId: p.id,
            name: p.name || 'Untitled',
            description: p.description || undefined,
            variableDefaults: p.variable_defaults || undefined,
        }));
        if (!searchQuery.trim()) return mapped;
        const q = searchQuery.toLowerCase();
        return mapped.filter(a =>
            a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
        );
    }, [userPrompts, searchQuery]);

    const handleSelect = (agent: { promptId: string; name: string; description?: string; variableDefaults?: AgentConfig['variableDefaults'] }) => {
        onSelect({
            promptId: agent.promptId,
            name: agent.name,
            description: agent.description,
            variableDefaults: agent.variableDefaults,
        });
    };

    return (
        <div className="flex flex-col max-h-[400px]">
            {/* Search */}
            <div className="p-1.5 border-b border-border">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search agents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full pl-6 pr-2 py-1 text-[11px] rounded-md bg-muted/50 text-foreground placeholder:text-muted-foreground/50 outline-none focus:bg-muted/80 border-0"
                        style={{ fontSize: '16px' }}
                    />
                </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
                {/* System Agents */}
                {filteredSystem.length > 0 && (
                    <div className="py-1">
                        <div className="px-2.5 py-1 text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                            System Agents
                        </div>
                        {filteredSystem.map((agent) => (
                            <button
                                key={agent.id}
                                onClick={() => handleSelect(agent)}
                                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-left text-xs transition-colors ${
                                    selectedAgent?.promptId === agent.promptId
                                        ? 'bg-accent/60 text-foreground'
                                        : 'text-foreground/80 hover:bg-accent/40'
                                }`}
                            >
                                <span className="text-muted-foreground flex-shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">
                                    {agent.icon || <Bot className="h-3.5 w-3.5" />}
                                </span>
                                <span className="truncate flex-1 min-w-0" title={agent.name}>{agent.name}</span>
                                {selectedAgent?.promptId === agent.promptId && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* User Agents */}
                {isAuthenticated && filteredUser.length > 0 && (
                    <div className="py-1 border-t border-border">
                        <div className="px-2.5 py-1 text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                            My Agents
                        </div>
                        {filteredUser.map((agent) => (
                            <button
                                key={agent.id}
                                onClick={() => handleSelect(agent)}
                                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-left text-xs transition-colors ${
                                    selectedAgent?.promptId === agent.promptId
                                        ? 'bg-accent/60 text-foreground'
                                        : 'text-foreground/80 hover:bg-accent/40'
                                }`}
                            >
                                <Bot className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="truncate flex-1 min-w-0" title={agent.name}>{agent.name}</span>
                                {agent.variableDefaults && agent.variableDefaults.length > 0 && (
                                    <Sparkles className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                                )}
                                {selectedAgent?.promptId === agent.promptId && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* No results */}
                {filteredSystem.length === 0 && filteredUser.length === 0 && (
                    <div className="py-6 text-center text-[11px] text-muted-foreground/50">
                        No agents found
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// SIDEBAR AGENT HEADER
// ============================================================================

export function SidebarAgentHeader({ selectedAgent, onAgentSelect, floating, compact }: SidebarAgentHeaderProps) {
    const displayName = selectedAgent?.name || 'General Chat';
    const currentIcon = DEFAULT_AGENTS.find(a => a.promptId === selectedAgent?.promptId)?.icon;

    const handleSelect = (agent: AgentConfig) => {
        onAgentSelect?.(agent);
    };

    // Floating mode — fixed-position pill visible when sidebar is closed
    if (floating) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="fixed top-[3rem] left-14 z-50 flex items-center gap-2 h-8 text-muted-foreground hover:text-foreground transition-colors"
                        title={displayName ? `Switch agent: ${displayName}` : 'Switch agent'}
                    >
                        <span className="text-[11px] font-medium max-w-[140px] truncate" title={displayName}>
                            {displayName}
                        </span>
                        <ChevronDown className="h-2.5 w-2.5 flex-shrink-0" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[280px] w-[320px] max-w-[min(90vw,380px)] p-0" sideOffset={4}>
                    <AgentPickerContent selectedAgent={selectedAgent} onSelect={handleSelect} />
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // Inline mode — inside sidebar header (default) or mobile sub-header (compact)
    return (
        <div className={compact ? 'flex items-center' : 'flex items-center pl-11 pr-2 py-2 border-b border-border'}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 h-8 rounded-md hover:bg-accent/50 transition-colors min-w-0 group">
                        <span className="text-xs font-medium text-foreground truncate max-w-[180px]" title={displayName}>
                            {displayName}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[280px] w-[320px] max-w-[min(90vw,380px)] p-0" sideOffset={4}>
                    <AgentPickerContent selectedAgent={selectedAgent} onSelect={handleSelect} />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export default SidebarAgentHeader;
