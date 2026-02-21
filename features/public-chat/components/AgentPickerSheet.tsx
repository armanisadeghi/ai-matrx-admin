'use client';

import { useState, useMemo } from 'react';
import { Search, X, Check, Sparkles, Bot, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAgentsContext } from '../context/AgentsContext';
import { DEFAULT_AGENTS } from './AgentSelector';
import type { AgentConfig } from '../context/ChatContext';
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// TYPES
// ============================================================================

interface AgentPickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedAgent?: AgentConfig | null;
    onSelect: (agent: AgentConfig) => void;
}

// ============================================================================
// AGENT LIST ITEM — shared between mobile and desktop
// ============================================================================

function AgentItem({
    agent,
    isSelected,
    onSelect,
    icon,
    compact,
}: {
    agent: { promptId: string; name: string; description?: string; variableDefaults?: AgentConfig['variableDefaults'] };
    isSelected: boolean;
    onSelect: () => void;
    icon?: React.ReactNode;
    compact?: boolean;
}) {
    const varCount = agent.variableDefaults?.length || 0;

    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 text-left transition-colors rounded-xl ${
                compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
            } ${
                isSelected
                    ? 'bg-primary/10 dark:bg-primary/15'
                    : 'hover:bg-accent/60 active:bg-accent'
            }`}
        >
            <div className={`flex-shrink-0 flex items-center justify-center rounded-lg bg-muted ${
                compact ? 'w-8 h-8' : 'w-10 h-10'
            }`}>
                <span className="text-muted-foreground [&_svg]:h-[18px] [&_svg]:w-[18px]">
                    {icon || <Bot className="h-[18px] w-[18px]" />}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <div className={`font-medium text-foreground truncate ${compact ? 'text-sm' : 'text-[15px]'}`}>
                    {agent.name}
                </div>
                {agent.description && (
                    <div className={`text-muted-foreground line-clamp-1 ${compact ? 'text-xs mt-0.5' : 'text-[13px] mt-0.5'}`}>
                        {agent.description}
                    </div>
                )}
                {varCount > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                            {varCount} variable{varCount > 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>
            {isSelected && (
                <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-primary" />
                </div>
            )}
        </button>
    );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-4 pt-4 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {children}
        </div>
    );
}

// ============================================================================
// AGENT LIST CONTENT — shared between mobile drawer and desktop dialog
// ============================================================================

function AgentListContent({
    selectedAgent,
    onSelect,
    searchQuery,
    compact,
}: {
    selectedAgent?: AgentConfig | null;
    onSelect: (agent: AgentConfig) => void;
    searchQuery: string;
    compact?: boolean;
}) {
    const { userPrompts, userPromptsLoading, userPromptsError } = useAgentsContext();

    const filteredSystem = useMemo(() => {
        if (!searchQuery.trim()) return DEFAULT_AGENTS;
        const q = searchQuery.toLowerCase();
        return DEFAULT_AGENTS.filter(
            a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const filteredUser = useMemo(() => {
        const mapped = userPrompts.map(p => ({
            promptId: p.id,
            name: p.name || 'Untitled',
            description: p.description || undefined,
            variableDefaults: p.variable_defaults || undefined,
        }));
        if (!searchQuery.trim()) return mapped;
        const q = searchQuery.toLowerCase();
        return mapped.filter(
            a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
        );
    }, [userPrompts, searchQuery]);

    const hasSystem = filteredSystem.length > 0;
    const hasUser = filteredUser.length > 0;

    return (
        <>
            {/* System Agents */}
            {hasSystem && (
                <>
                    <SectionHeader>System Agents</SectionHeader>
                    <div className="px-2">
                        {filteredSystem.map(agent => (
                            <AgentItem
                                key={agent.id}
                                agent={agent}
                                icon={agent.icon}
                                isSelected={selectedAgent?.promptId === agent.promptId}
                                onSelect={() =>
                                    onSelect({
                                        promptId: agent.promptId,
                                        name: agent.name,
                                        description: agent.description,
                                        variableDefaults: agent.variableDefaults,
                                    })
                                }
                                compact={compact}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* User Agents */}
            {hasUser && (
                <>
                    <SectionHeader>My Agents</SectionHeader>
                    <div className="px-2">
                        {filteredUser.map(agent => (
                            <AgentItem
                                key={agent.promptId}
                                agent={agent}
                                isSelected={selectedAgent?.promptId === agent.promptId}
                                onSelect={() => onSelect(agent)}
                                compact={compact}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Loading state */}
            {userPromptsLoading && !hasUser && (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading agents...</span>
                </div>
            )}

            {/* Error state */}
            {userPromptsError && !hasUser && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                    Could not load custom agents
                </div>
            )}

            {/* No results */}
            {!hasSystem && !hasUser && !userPromptsLoading && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                    No agents found
                </div>
            )}
        </>
    );
}

// ============================================================================
// MOBILE BOTTOM SHEET
// ============================================================================

function MobileAgentPicker({ open, onOpenChange, selectedAgent, onSelect }: AgentPickerSheetProps) {
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSelect = (agent: AgentConfig) => {
        onSelect(agent);
        onOpenChange(false);
        setSearchQuery('');
        setShowSearch(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            setSearchQuery('');
            setShowSearch(false);
        }
    };

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="max-h-[85dvh]">
                {/* Header: title + search toggle */}
                <div className="flex items-center justify-between px-4 pt-2 pb-1">
                    <DrawerTitle className="text-base font-semibold">
                        Choose an Agent
                    </DrawerTitle>
                    <button
                        onClick={() => {
                            setShowSearch(!showSearch);
                            if (showSearch) setSearchQuery('');
                        }}
                        className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                    >
                        {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                    </button>
                </div>

                {/* Search bar — toggled, not shown by default (avoids keyboard popup) */}
                {showSearch && (
                    <div className="px-4 pb-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search agents..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 border-0"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                    </div>
                )}

                {/* Scrollable agent list */}
                <div className="flex-1 overflow-y-auto overscroll-contain pb-safe" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
                    <AgentListContent
                        selectedAgent={selectedAgent}
                        onSelect={handleSelect}
                        searchQuery={searchQuery}
                    />
                </div>
            </DrawerContent>
        </Drawer>
    );
}

// ============================================================================
// DESKTOP DIALOG
// ============================================================================

function DesktopAgentPicker({ open, onOpenChange, selectedAgent, onSelect }: AgentPickerSheetProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSelect = (agent: AgentConfig) => {
        onSelect(agent);
        onOpenChange(false);
        setSearchQuery('');
    };

    const handleOpenChange = (isOpen: boolean) => {
        onOpenChange(isOpen);
        if (!isOpen) setSearchQuery('');
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
                {/* Header with search */}
                <div className="p-4 pb-3 border-b border-border">
                    <DialogTitle className="text-base font-semibold mb-3">
                        Choose an Agent
                    </DialogTitle>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search agents..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 border-0"
                        />
                    </div>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto max-h-[400px]">
                    <AgentListContent
                        selectedAgent={selectedAgent}
                        onSelect={handleSelect}
                        searchQuery={searchQuery}
                        compact
                    />
                    <div className="h-2" />
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// UNIFIED AGENT PICKER — renders Drawer on mobile, Dialog on desktop
// ============================================================================

export function AgentPickerSheet(props: AgentPickerSheetProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return <MobileAgentPicker {...props} />;
    }

    return <DesktopAgentPicker {...props} />;
}

export default AgentPickerSheet;
