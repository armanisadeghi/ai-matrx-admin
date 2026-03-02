'use client';

// app/(ssr)/ssr/chat/_components/ChatSidebarClient.tsx
// Renders instantly with skeleton, fetches conversations after mount.
// No server props — zero impact on layout render time.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { MessageCircle, Plus, Search as SearchIcon } from 'lucide-react';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';
import type { CxConversationSummary } from '@/features/public-chat/types/cx-tables';
import { supabase } from '@/utils/supabase/client';

interface ConversationGroup {
    label: string;
    items: CxConversationSummary[];
}

function groupConversationsByDate(conversations: CxConversationSummary[]): ConversationGroup[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: { today: CxConversationSummary[]; yesterday: CxConversationSummary[]; week: CxConversationSummary[]; older: CxConversationSummary[] } = {
        today: [], yesterday: [], week: [], older: [],
    };

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

function ConversationSkeleton() {
    return (
        <div style={{ padding: '0.5rem 0' }}>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="chat-skeleton-item">
                    <div className="chat-skeleton-icon" />
                    <div className="chat-skeleton-text" />
                </div>
            ))}
        </div>
    );
}

export default function ChatSidebarClient() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [conversations, setConversations] = useState<CxConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');

    const activeConversationId = useMemo(() => {
        const match = pathname.match(/\/ssr\/chat\/([^/?]+)/);
        return match?.[1] ?? null;
    }, [pathname]);

    const activeAgentId = searchParams.get('agent') ?? null;

    // Fetch conversations after mount — calls Supabase directly, no API route
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
                // Non-critical — sidebar shows empty state
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    // Listen for workspace events — new conversations, updates
    useEffect(() => {
        function handleConversationCreated(e: Event) {
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

        function handleConversationUpdated(e: Event) {
            const detail = (e as CustomEvent).detail as { id: string; title?: string };
            setConversations(prev =>
                prev.map(c =>
                    c.id === detail.id
                        ? { ...c, updated_at: new Date().toISOString(), ...(detail.title ? { title: detail.title } : {}) }
                        : c
                )
            );
        }

        window.addEventListener('chat:conversationCreated', handleConversationCreated);
        window.addEventListener('chat:conversationUpdated', handleConversationUpdated);
        return () => {
            window.removeEventListener('chat:conversationCreated', handleConversationCreated);
            window.removeEventListener('chat:conversationUpdated', handleConversationUpdated);
        };
    }, []);

    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const q = searchQuery.toLowerCase();
        return conversations.filter(c => (c.title ?? '').toLowerCase().includes(q));
    }, [conversations, searchQuery]);

    const groups = useMemo(() => groupConversationsByDate(filteredConversations), [filteredConversations]);

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
            <div className="chat-sidebar-header">
                <div className="flex items-center justify-between">
                    <h2>Chat</h2>
                    <button
                        className="chat-new-btn w-auto m-0 px-2.5 py-1 text-xs"
                        onClick={() => navigateToNewChat()}
                    >
                        <Plus size={14} />
                        New
                    </button>
                </div>
            </div>

            <div className="chat-sidebar-search">
                <div className="relative">
                    <SearchIcon size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-7"
                    />
                </div>
            </div>

            <div className="chat-sidebar-agents">
                <div className="chat-sidebar-agents-label">Agents</div>
                <div className="flex flex-wrap">
                    {DEFAULT_AGENTS.map(agent => (
                        <button
                            key={agent.id}
                            className="chat-sidebar-agent-chip"
                            data-active={activeAgentId === agent.promptId || (!activeAgentId && agent.id === 'general-chat')}
                            onClick={() => navigateToNewChat(agent.promptId)}
                            title={agent.description}
                        >
                            {agent.icon}
                            <span>{agent.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="chat-sidebar-list">
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
                            <div className="chat-sidebar-group-label">{group.label}</div>
                            {group.items.map(conv => (
                                <button
                                    key={conv.id}
                                    className="chat-sidebar-item"
                                    data-active={activeConversationId === conv.id}
                                    onClick={() => navigateToConversation(conv.id)}
                                >
                                    <MessageCircle size={14} className="chat-sidebar-item-icon" />
                                    <span className="chat-sidebar-item-title">{conv.title || 'Untitled Chat'}</span>
                                    <span className="chat-sidebar-item-time">{formatTime(conv.updated_at)}</span>
                                </button>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
