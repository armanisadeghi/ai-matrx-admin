'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, Bot, Lock, Search, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAgentsContext } from '../../context/AgentsContext';
import { DEFAULT_AGENTS } from '../AgentSelector';
import type { AgentConfig } from '../../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface SidebarAgentsProps {
    selectedAgent?: AgentConfig | null;
    onAgentSelect?: (agent: AgentConfig) => void;
    searchQuery?: string;
}

type AgentItem = {
    id: string;
    name: string;
    description?: string;
    promptId: string;
    variableDefaults?: AgentConfig['variableDefaults'];
};

// Default items visible before expanding
const DEFAULT_VISIBLE = 3;

// ============================================================================
// AGENT LIST ITEM — fixed height, no layout shift from tooltip
// ============================================================================

function AgentListItem({
    name,
    description,
    isSelected,
    onClick,
}: {
    name: string;
    description?: string;
    isSelected: boolean;
    onClick: () => void;
}) {
    // Always wrap in Tooltip to keep DOM structure consistent (prevents layout shift)
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    className={`flex items-center gap-2 w-full px-2 py-[3px] rounded-md text-left transition-colors ${
                        isSelected
                            ? 'bg-accent/60 text-foreground'
                            : 'text-foreground/70 hover:bg-accent/40 hover:text-foreground'
                    }`}
                >
                    <Bot className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-[11px] truncate flex-1">{name}</span>
                    {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                </button>
            </TooltipTrigger>
            {description && (
                <TooltipContent
                    side="right"
                    sideOffset={8}
                    collisionPadding={16}
                    className="max-w-[200px] text-[11px] pointer-events-none"
                >
                    {description}
                </TooltipContent>
            )}
        </Tooltip>
    );
}

// ============================================================================
// COLLAPSIBLE SUBSECTION — compact, with inline search
// ============================================================================

function AgentSubsection({
    title,
    agents,
    selectedAgent,
    onAgentSelect,
    emptyMessage,
    forceExpanded,
}: {
    title: string;
    agents: AgentItem[];
    selectedAgent?: AgentConfig | null;
    onAgentSelect?: (agent: AgentConfig) => void;
    emptyMessage?: string;
    forceExpanded?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [localSearch, setLocalSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const expanded = forceExpanded || isExpanded;

    // Filter by local search
    const filteredAgents = useMemo(() => {
        if (!localSearch.trim()) return agents;
        const q = localSearch.toLowerCase();
        return agents.filter(a =>
            a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
        );
    }, [agents, localSearch]);

    const visibleAgents = expanded ? filteredAgents : filteredAgents.slice(0, DEFAULT_VISIBLE);
    const hasMore = filteredAgents.length > DEFAULT_VISIBLE;
    const hiddenCount = filteredAgents.length - DEFAULT_VISIBLE;

    const handleSelect = (agent: AgentItem) => {
        onAgentSelect?.({
            promptId: agent.promptId,
            name: agent.name,
            description: agent.description,
            variableDefaults: agent.variableDefaults,
        });
    };

    const toggleSearch = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showSearch) {
            setLocalSearch('');
            setShowSearch(false);
        } else {
            setShowSearch(true);
        }
    };

    return (
        <div className="pt-0.5 pb-0.5">
            {/* Section header row */}
            <div className="flex items-center gap-1 px-2 py-[3px]">
                <button
                    onClick={() => setIsExpanded(!expanded)}
                    className="flex items-center gap-1 flex-1 min-w-0 text-left"
                >
                    <ChevronRight className={`h-2.5 w-2.5 text-muted-foreground/50 transition-transform duration-150 flex-shrink-0 ${
                        expanded ? 'rotate-90' : ''
                    }`} />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none truncate">
                        {title}
                    </span>
                    {/* Inline count + expand hint */}
                    {hasMore && !expanded && (
                        <span className="text-[9px] text-muted-foreground/40 ml-0.5 flex-shrink-0">
                            +{hiddenCount}
                        </span>
                    )}
                </button>

                {/* Search icon */}
                {agents.length > 3 && (
                    <button
                        onClick={toggleSearch}
                        className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0"
                        title="Search agents"
                    >
                        {showSearch ? <X className="h-2.5 w-2.5" /> : <Search className="h-2.5 w-2.5" />}
                    </button>
                )}
            </div>

            {/* Inline search input */}
            {showSearch && (
                <div className="px-2 pb-1">
                    <input
                        type="text"
                        placeholder="Filter..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        autoFocus
                        className="w-full px-2 py-0.5 text-[11px] rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/50 outline-none focus:bg-muted/80 border-0"
                        style={{ fontSize: '16px' }}
                    />
                </div>
            )}

            {/* Agent list */}
            <div className="px-1">
                {agents.length === 0 && emptyMessage && (
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground/50">
                        <Lock className="h-2.5 w-2.5 flex-shrink-0" />
                        <span>{emptyMessage}</span>
                    </div>
                )}
                {visibleAgents.map((agent) => (
                    <AgentListItem
                        key={agent.id || agent.promptId}
                        name={agent.name}
                        description={agent.description}
                        isSelected={selectedAgent?.promptId === agent.promptId}
                        onClick={() => handleSelect(agent)}
                    />
                ))}
                {filteredAgents.length === 0 && agents.length > 0 && localSearch && (
                    <p className="px-2 py-1 text-[10px] text-muted-foreground/40">No matches</p>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// SIDEBAR AGENTS
// ============================================================================

export function SidebarAgents({ selectedAgent, onAgentSelect, searchQuery = '' }: SidebarAgentsProps) {
    const user = useSelector(selectUser);
    const isAuthenticated = !!user?.id;
    const { userPrompts, userPromptsLoading: isLoading } = useAgentsContext();

    // Filter system agents by global search
    const filteredSystemAgents = useMemo(() => {
        if (!searchQuery.trim()) return DEFAULT_AGENTS;
        const q = searchQuery.toLowerCase();
        return DEFAULT_AGENTS.filter(a =>
            a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    // Map user prompts to agent items
    const mappedUserPrompts: AgentItem[] = useMemo(() => {
        return userPrompts.map(p => ({
            id: p.id,
            name: p.name || 'Untitled',
            description: p.description || undefined,
            promptId: p.id,
            variableDefaults: p.variable_defaults || undefined,
        }));
    }, [userPrompts]);

    // Filter user prompts by global search
    const filteredUserPrompts = useMemo(() => {
        if (!searchQuery.trim()) return mappedUserPrompts;
        const q = searchQuery.toLowerCase();
        return mappedUserPrompts.filter(a =>
            a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
        );
    }, [mappedUserPrompts, searchQuery]);

    // Community agents — placeholder using same data path, separate for easy swap
    const communityAgents = useMemo(() => {
        // TODO: Replace with actual community agents API
        return filteredSystemAgents.map(a => ({
            ...a,
            id: `community-${a.id}`,
        }));
    }, [filteredSystemAgents]);

    // Hide entire section if global search yields nothing
    const hasResults = filteredSystemAgents.length > 0 || filteredUserPrompts.length > 0 || communityAgents.length > 0;
    if (searchQuery && !hasResults) return null;

    return (
        <TooltipProvider delayDuration={400}>
            <div className="border-b border-border py-0.5">
                <AgentSubsection
                    title="System Agents"
                    agents={filteredSystemAgents}
                    selectedAgent={selectedAgent}
                    onAgentSelect={onAgentSelect}
                    forceExpanded={!!searchQuery}
                />

                <AgentSubsection
                    title="My Agents"
                    agents={isAuthenticated ? filteredUserPrompts : []}
                    selectedAgent={selectedAgent}
                    onAgentSelect={onAgentSelect}
                    emptyMessage={
                        isAuthenticated
                            ? (isLoading ? 'Loading...' : 'No agents yet')
                            : 'Sign in to create agents'
                    }
                    forceExpanded={!!searchQuery}
                />

                <AgentSubsection
                    title="Community"
                    agents={communityAgents}
                    selectedAgent={selectedAgent}
                    onAgentSelect={onAgentSelect}
                    forceExpanded={!!searchQuery}
                />
            </div>
        </TooltipProvider>
    );
}

export default SidebarAgents;
