'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, Bot, Loader2, Sparkles, User, Users, Globe } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAgentsContext } from '../context/AgentsContext';
import { DEFAULT_AGENTS } from './AgentSelector';
import type { AgentConfig } from '../context/ChatContext';
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
} from '@/components/ui/drawer';

// ============================================================================
// TYPES
// ============================================================================

interface AgentPickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedAgent?: AgentConfig | null;
    onSelect: (agent: AgentConfig) => void;
}

type FilterType = 'all' | 'system' | 'mine';

// ============================================================================
// MOBILE AGENT LIST ITEM
// ============================================================================

function MobileAgentItem({
    agent,
    isSelected,
    onSelect,
    icon,
}: {
    agent: { promptId: string; name: string; description?: string; variableDefaults?: AgentConfig['variableDefaults'] };
    isSelected: boolean;
    onSelect: () => void;
    icon?: React.ReactNode;
}) {
    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 text-left transition-colors rounded-xl px-4 py-3 ${
                isSelected
                    ? 'bg-primary/10 dark:bg-primary/15'
                    : 'hover:bg-accent/60 active:bg-accent'
            }`}
        >
            <div className="flex-shrink-0 flex items-center justify-center rounded-lg bg-muted w-9 h-9">
                <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
                    {icon || <Bot className="h-4 w-4" />}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium text-foreground truncate">
                    {agent.name}
                </div>
                {agent.description && (
                    <div className="text-[13px] text-muted-foreground line-clamp-1 mt-0.5">
                        {agent.description}
                    </div>
                )}
            </div>
            {isSelected && (
                <div className="flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
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
// MOBILE AGENT LIST CONTENT
// ============================================================================

function MobileAgentListContent({
    selectedAgent,
    onSelect,
    searchQuery,
}: {
    selectedAgent?: AgentConfig | null;
    onSelect: (agent: AgentConfig) => void;
    searchQuery: string;
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
            {hasSystem && (
                <>
                    <SectionHeader>System Agents</SectionHeader>
                    <div className="px-2">
                        {filteredSystem.map(agent => (
                            <MobileAgentItem
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
                            />
                        ))}
                    </div>
                </>
            )}

            {hasUser && (
                <>
                    <SectionHeader>My Agents</SectionHeader>
                    <div className="px-2">
                        {filteredUser.map(agent => (
                            <MobileAgentItem
                                key={agent.promptId}
                                agent={agent}
                                isSelected={selectedAgent?.promptId === agent.promptId}
                                onSelect={() => onSelect(agent)}
                            />
                        ))}
                    </div>
                </>
            )}

            {userPromptsLoading && !hasUser && (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading agents...</span>
                </div>
            )}

            {userPromptsError && !hasUser && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                    Could not load custom agents
                </div>
            )}

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

                <div className="flex-1 overflow-y-auto overscroll-contain pb-safe" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
                    <MobileAgentListContent
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
// DESKTOP AGENT CARD — compact grid card for desktop modal
// ============================================================================

function DesktopAgentCard({
    agent,
    isSelected,
    onSelect,
    icon,
    badge,
}: {
    agent: { promptId: string; name: string; description?: string; variableDefaults?: AgentConfig['variableDefaults'] };
    isSelected: boolean;
    onSelect: () => void;
    icon?: React.ReactNode;
    badge?: string;
}) {
    const varCount = agent.variableDefaults?.length || 0;

    return (
        <button
            onClick={onSelect}
            className={`group relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-150 ${
                isSelected
                    ? 'border-primary/40 bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-accent/40 active:bg-accent/60'
            }`}
        >
            {/* Top row: icon + selected indicator */}
            <div className="flex items-start justify-between w-full">
                <div className={`flex items-center justify-center rounded-lg w-8 h-8 ${
                    isSelected ? 'bg-primary/15' : 'bg-muted'
                }`}>
                    <span className={`[&_svg]:h-4 [&_svg]:w-4 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                        {icon || <Bot className="h-4 w-4" />}
                    </span>
                </div>
                {isSelected && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                )}
            </div>

            {/* Name */}
            <div className="w-full">
                <div className="text-sm font-medium text-foreground truncate leading-tight">
                    {agent.name}
                </div>
                {agent.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {agent.description}
                    </div>
                )}
            </div>

            {/* Bottom badges */}
            <div className="flex items-center gap-1.5 mt-auto">
                {badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {badge}
                    </span>
                )}
                {varCount > 0 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        {varCount} {varCount === 1 ? 'input' : 'inputs'}
                    </span>
                )}
            </div>
        </button>
    );
}

// ============================================================================
// FILTER TOGGLE
// ============================================================================

const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Globe className="h-3 w-3" /> },
    { id: 'system', label: 'System', icon: <Sparkles className="h-3 w-3" /> },
    { id: 'mine', label: 'My Agents', icon: <User className="h-3 w-3" /> },
];

function FilterToggles({
    active,
    onChange,
    userCount,
}: {
    active: FilterType;
    onChange: (filter: FilterType) => void;
    userCount: number;
}) {
    return (
        <div className="flex items-center gap-1">
            {FILTERS.map(f => {
                const isActive = active === f.id;
                const count = f.id === 'system' ? DEFAULT_AGENTS.length
                    : f.id === 'mine' ? userCount
                    : DEFAULT_AGENTS.length + userCount;

                return (
                    <button
                        key={f.id}
                        onClick={() => onChange(f.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            isActive
                                ? 'bg-foreground text-background'
                                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                        {f.icon}
                        <span>{f.label}</span>
                        <span className={`ml-0.5 ${isActive ? 'text-background/70' : 'text-muted-foreground/60'}`}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ============================================================================
// DESKTOP DIALOG — custom built, no Dialog component dependency
// ============================================================================

function DesktopAgentPicker({ open, onOpenChange, selectedAgent, onSelect }: AgentPickerSheetProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const inputRef = useRef<HTMLInputElement>(null);
    const { userPrompts, userPromptsLoading, userPromptsError } = useAgentsContext();

    // Focus search input on open
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setSearchQuery('');
            setFilter('all');
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onOpenChange]);

    const handleSelect = (agent: AgentConfig) => {
        onSelect(agent);
        onOpenChange(false);
        setSearchQuery('');
    };

    // Map user prompts to agent config shape
    const userAgents = useMemo(() =>
        userPrompts.map(p => ({
            promptId: p.id,
            name: p.name || 'Untitled',
            description: p.description || undefined,
            variableDefaults: p.variable_defaults || undefined,
        })),
    [userPrompts]);

    // Filter + search
    const { systemAgents, myAgents } = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        let sys = filter === 'mine' ? [] : [...DEFAULT_AGENTS];
        let usr = filter === 'system' ? [] : [...userAgents];

        if (q) {
            sys = sys.filter(a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
            usr = usr.filter(a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
        }

        return { systemAgents: sys, myAgents: usr };
    }, [searchQuery, filter, userAgents]);

    const totalResults = systemAgents.length + myAgents.length;

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
                onClick={() => onOpenChange(false)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] pointer-events-none">
                <div
                    className="pointer-events-auto w-[560px] max-h-[70vh] bg-popover rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Search bar */}
                    <div className="px-4 pt-4 pb-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search agents..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 border-0"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Filter toggles */}
                        <div className="flex items-center justify-between mt-3">
                            <FilterToggles
                                active={filter}
                                onChange={setFilter}
                                userCount={userAgents.length}
                            />
                            {searchQuery && (
                                <span className="text-xs text-muted-foreground">
                                    {totalResults} {totalResults === 1 ? 'result' : 'results'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="w-full h-px bg-border" />

                    {/* Agent grid */}
                    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                        {/* System agents */}
                        {systemAgents.length > 0 && (
                            <div className="mb-4">
                                {filter === 'all' && myAgents.length > 0 && (
                                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        System
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {systemAgents.map(agent => (
                                        <DesktopAgentCard
                                            key={agent.id}
                                            agent={agent}
                                            icon={agent.icon}
                                            isSelected={selectedAgent?.promptId === agent.promptId}
                                            onSelect={() =>
                                                handleSelect({
                                                    promptId: agent.promptId,
                                                    name: agent.name,
                                                    description: agent.description,
                                                    variableDefaults: agent.variableDefaults,
                                                })
                                            }
                                            badge="System"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* User agents */}
                        {myAgents.length > 0 && (
                            <div className="mb-2">
                                {filter === 'all' && systemAgents.length > 0 && (
                                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        My Agents
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {myAgents.map(agent => (
                                        <DesktopAgentCard
                                            key={agent.promptId}
                                            agent={agent}
                                            isSelected={selectedAgent?.promptId === agent.promptId}
                                            onSelect={() => handleSelect(agent)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Loading */}
                        {userPromptsLoading && myAgents.length === 0 && filter !== 'system' && (
                            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Loading agents...</span>
                            </div>
                        )}

                        {/* Error */}
                        {userPromptsError && myAgents.length === 0 && filter !== 'system' && (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                Could not load custom agents
                            </div>
                        )}

                        {/* No results */}
                        {totalResults === 0 && !userPromptsLoading && (
                            <div className="py-12 text-center">
                                <Bot className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery
                                        ? `No agents matching "${searchQuery}"`
                                        : 'No agents available'
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Keyboard hint footer */}
                    <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span><kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd> to close</span>
                    </div>
                </div>
            </div>
        </>
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
