'use client';

// app/(ssr)/ssr/chat/_components/ChatSidebarClient.tsx
// Chat sidebar with agent chips, conversation history, and search.
// Uses shared AgentsContext for system/builtin/user agents.
// Syncs with ChatWorkspace via custom DOM events.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    MessageCircle,
    Plus,
    Search as SearchIcon,
    PanelLeftClose,
    Bot,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';
import { useAgentsContext } from '@/features/public-chat/context/AgentsContext';
import type { CxConversationSummary } from '@/features/public-chat/types/cx-tables';
import { supabase } from '@/utils/supabase/client';
import { useChatSidebar } from './ChatSidebarContext';

// ============================================================================
// HELPERS
// ============================================================================

interface ConversationGroup {
    label: string;
    items: CxConversationSummary[];
}

function groupConversationsByDate(conversations: CxConversationSummary[]): ConversationGroup[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups = { today: [] as CxConversationSummary[], yesterday: [] as CxConversationSummary[], week: [] as CxConversationSummary[], older: [] as CxConversationSummary[] };

    for (const conv of conversations) {
        const d = new Date(conv.updated_at);
        if (d >= today) groups.today.push(conv);
        else if (d >= yesterday) groups.yesterday.push(conv);
        else if (d >= weekAgo) groups.week.push(conv);
        else groups.older.push(conv);
    }

    const result: ConversationGroup[] = [];
    if (groups.today.length) result.push({ label: 'Today', items: groups.today });
    if (groups.yesterday.length) result.push({ label: 'Yesterday', items: groups.yesterday });
    if (groups.week.length) result.push({ label: 'Previous 7 Days', items: groups.week });
    if (groups.older.length) result.push({ label: 'Older', items: groups.older });
    return result;
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return mins <= 1 ? 'now' : `${mins}m`;
    }
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// SKELETON
// ============================================================================

function ConversationSkeleton() {
    return (
        <div className="py-2">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 mx-1">
                    <div className="w-4 h-4 rounded shrink-0 bg-linear-to-r from-muted/30 via-muted/60 to-muted/30 bg-[length:200px_100%] animate-ssr-shimmer" />
                    <div className="h-3 rounded flex-1 bg-linear-to-r from-muted/30 via-muted/60 to-muted/30 bg-[length:200px_100%] animate-ssr-shimmer" />
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChatSidebarClient() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { builtinPrompts, userPrompts } = useAgentsContext();
    const { close: closeSidebar } = useChatSidebar();

    const [conversations, setConversations] = useState<CxConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [agentsExpanded, setAgentsExpanded] = useState(false);

    const activeConversationId = useMemo(() => {
        const match = pathname.match(/\/ssr\/chat\/([^/?]+)/);
        return match?.[1] ?? null;
    }, [pathname]);

    const activeAgentId = searchParams.get('agent') ?? null;

    // Fetch conversations after mount
    useEffect(() => {
        async function load() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('cx_conversation')
                    .select('id, title, status, message_count, created_at, updated_at')
                    .eq('user_id', user.id)
                    .is('deleted_at', null)
                    .in('status', ['active', 'completed'])
                    .order('updated_at', { ascending: false })
                    .limit(50);

                if (data) setConversations(data as CxConversationSummary[]);
            } catch {
                // Non-critical
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    // Listen for workspace events
    useEffect(() => {
        function handleCreated(e: Event) {
            const detail = (e as CustomEvent).detail as { id: string; title: string };
            setConversations(prev => {
                if (prev.some(c => c.id === detail.id)) return prev;
                return [{
                    id: detail.id,
                    title: detail.title || 'New Chat',
                    status: 'active' as const,
                    message_count: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }, ...prev];
            });
        }

        function handleUpdated(e: Event) {
            const detail = (e as CustomEvent).detail as { id: string; title?: string };
            setConversations(prev =>
                prev.map(c =>
                    c.id === detail.id
                        ? { ...c, updated_at: new Date().toISOString(), ...(detail.title ? { title: detail.title } : {}) }
                        : c
                )
            );
        }

        window.addEventListener('chat:conversationCreated', handleCreated);
        window.addEventListener('chat:conversationUpdated', handleUpdated);
        return () => {
            window.removeEventListener('chat:conversationCreated', handleCreated);
            window.removeEventListener('chat:conversationUpdated', handleUpdated);
        };
    }, []);

    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const q = searchQuery.toLowerCase();
        return conversations.filter(c => (c.title ?? '').toLowerCase().includes(q));
    }, [conversations, searchQuery]);

    const groups = useMemo(() => groupConversationsByDate(filteredConversations), [filteredConversations]);

    // Combine all agents: system defaults + builtins + user prompts
    const allAgents = useMemo(() => {
        const builtins = builtinPrompts.map(p => ({
            id: p.id,
            promptId: p.id,
            name: p.name || 'Untitled',
            description: p.description || undefined,
            icon: <Bot className="w-3 h-3" />,
        }));
        const userAgents = userPrompts.map(p => ({
            id: p.id,
            promptId: p.id,
            name: p.name || 'Untitled',
            description: p.description || undefined,
            icon: <Bot className="w-3 h-3" />,
        }));
        return [...DEFAULT_AGENTS, ...builtins, ...userAgents];
    }, [builtinPrompts, userPrompts]);

    // Show first 6 agents by default, all when expanded
    const visibleAgents = agentsExpanded ? allAgents : allAgents.slice(0, 6);
    const hasMoreAgents = allAgents.length > 6;

    const navigateToConversation = useCallback((convId: string) => {
        window.history.pushState(null, '', `/ssr/chat/${convId}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, []);

    const navigateToNewChat = useCallback((agentId?: string) => {
        const url = agentId ? `/ssr/chat?agent=${agentId}` : '/ssr/chat';
        window.history.pushState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, []);

    return (
        <>
            {/* Header: title + collapse + new chat */}
            <div className="shrink-0 flex items-center justify-between px-3 h-10 border-b border-border/20">
                <div className="flex items-center gap-1.5">
                    <button
                        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
                        onClick={closeSidebar}
                        title="Close sidebar"
                    >
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                    <h2 className="text-[0.8125rem] font-semibold tracking-[-0.01em] text-foreground m-0">Chat</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
                        onClick={() => {
                            setShowSearch(!showSearch);
                            if (showSearch) setSearchQuery('');
                        }}
                        title="Search"
                    >
                        <SearchIcon className="w-4 h-4" />
                    </button>
                    <button
                        className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg border border-dashed border-border/40 bg-transparent text-muted-foreground cursor-pointer text-xs font-medium transition-all duration-150 hover:border-primary/40 hover:text-primary hover:bg-primary/5 font-[inherit]"
                        onClick={() => navigateToNewChat()}
                        title="New chat"
                    >
                        <Plus size={14} />
                        <span>New</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            {showSearch && (
                <div className="shrink-0 px-3 py-2">
                    <div className="relative">
                        <SearchIcon size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full h-8 px-2 pl-7 rounded-lg border border-border/30 bg-muted/30 text-xs text-foreground outline-none transition-[border-color,background] duration-150 focus:border-primary/50 focus:bg-background/80 placeholder:text-muted-foreground/60"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                </div>
            )}

            {/* Agent chips */}
            <div className="shrink-0 border-b border-border/20 p-2">
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground/60 px-1 pb-2 pt-1 select-none">
                    Agents
                </div>
                <div className="flex flex-wrap gap-1">
                    {visibleAgents.map(agent => (
                        <button
                            key={agent.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium border cursor-pointer transition-all duration-150 ${
                                activeAgentId === agent.promptId || (!activeAgentId && agent.id === 'general-chat')
                                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                                    : 'border-border/30 bg-muted/20 text-foreground/70 hover:bg-accent/50 hover:border-border/50'
                            }`}
                            onClick={() => navigateToNewChat(agent.promptId)}
                            title={agent.description}
                        >
                            <span className="[&_svg]:w-2.5 [&_svg]:h-2.5">{agent.icon}</span>
                            <span className="truncate max-w-[100px]">{agent.name}</span>
                        </button>
                    ))}
                    {hasMoreAgents && (
                        <button
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium border border-border/30 bg-muted/20 text-muted-foreground cursor-pointer transition-all duration-150 hover:bg-accent/50"
                            onClick={() => setAgentsExpanded(!agentsExpanded)}
                        >
                            {agentsExpanded ? (
                                <>Less <ChevronDown className="w-3 h-3" /></>
                            ) : (
                                <>{allAgents.length - 6} more <ChevronRight className="w-3 h-3" /></>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 min-h-0 overflow-y-auto py-1 scrollbar-thin-visible">
                {isLoading ? (
                    <ConversationSkeleton />
                ) : groups.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                        <MessageCircle size={20} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs text-muted-foreground/50 m-0">
                            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                        </p>
                    </div>
                ) : (
                    groups.map(group => (
                        <div key={group.label}>
                            <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground/60 px-3 pt-3 pb-1 select-none lg:text-[0.625rem] lg:pt-2">
                                {group.label}
                            </div>
                            {group.items.map(conv => (
                                <button
                                    key={conv.id}
                                    className={`flex items-center gap-2 py-1.5 px-3 mx-1 rounded-md cursor-pointer transition-[background] duration-[120ms] min-h-8 no-underline text-inherit border-none bg-transparent w-[calc(100%-0.5rem)] text-left font-[inherit] lg:py-[0.3125rem] lg:min-h-7 ${
                                        activeConversationId === conv.id
                                            ? 'bg-accent'
                                            : 'hover:bg-accent/50'
                                    }`}
                                    onClick={() => navigateToConversation(conv.id)}
                                >
                                    <MessageCircle size={14} className="shrink-0 w-4 h-4 text-muted-foreground/50" />
                                    <span className={`flex-1 text-[0.8125rem] leading-[1.3] text-foreground/80 whitespace-nowrap overflow-hidden text-ellipsis lg:text-xs ${
                                        activeConversationId === conv.id ? 'font-semibold text-foreground' : ''
                                    }`}>
                                        {conv.title || 'Untitled Chat'}
                                    </span>
                                    <span className="shrink-0 text-[0.6875rem] text-muted-foreground/50">
                                        {formatTime(conv.updated_at)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
