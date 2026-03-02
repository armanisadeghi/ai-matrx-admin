// app/(ssr)/ssr/chat/layout.tsx
// Server-rendered layout for the SSR chat route.
//
// Data flow:
//   1. Auth check — Supabase JWT (local, ~0ms)
//   2. Fetch lightweight conversation summaries (cx_conversations, no messages)
//   3. Pass conversation list to ChatSidebarClient (server → client prop)
//   4. ChatWorkspace manages all chat state as a client island
//
// User prompts / agents / models are available via the lite Redux store
// (pre-hydrated by SSRShellProviders in the parent layout).

import './chat.css';
import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import type { CxConversationSummary } from '@/features/public-chat/types/cx-tables';
import ChatSidebarClient from './_components/ChatSidebarClient';
import ChatWorkspace from './_components/ChatWorkspace';

// ============================================================================
// SKELETON FALLBACKS
// ============================================================================

function SidebarSkeleton() {
    return (
        <div>
            <div className="chat-sidebar-header">
                <div className="chat-skeleton-text" style={{ width: '40%', height: '0.875rem' }} />
            </div>
            <div style={{ padding: '0.5rem 0' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="chat-skeleton-item">
                        <div className="chat-skeleton-icon" />
                        <div className="chat-skeleton-text" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function WorkspaceSkeleton() {
    return (
        <div className="h-full flex flex-col items-center justify-center">
            <div className="chat-skeleton-icon" style={{ width: '2rem', height: '2rem', borderRadius: '50%' }} />
            <div className="chat-skeleton-text" style={{ width: '12rem', height: '1rem', marginTop: '0.75rem' }} />
        </div>
    );
}

// ============================================================================
// SERVER LAYOUT
// ============================================================================

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch lightweight conversation list for sidebar
    // Only id, title, status, message_count, updated_at — no messages
    let conversations: CxConversationSummary[] = [];

    if (user) {
        try {
            const { data, error } = await supabase
                .from('cx_conversation')
                .select('id, title, status, message_count, created_at, updated_at')
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .in('status', ['active', 'completed'])
                .order('updated_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                conversations = data as CxConversationSummary[];
            }
        } catch {
            // Non-critical — sidebar will show empty state
        }
    }

    return (
        <div className="chat-root">
            {/* Sidebar — server data passed as props */}
            <aside className="chat-sidebar">
                <Suspense fallback={<SidebarSkeleton />}>
                    <ChatSidebarClient conversations={conversations} />
                </Suspense>
            </aside>

            {/* Main content — client island */}
            <div className="chat-content">
                <Suspense fallback={<WorkspaceSkeleton />}>
                    <ChatWorkspace />
                </Suspense>
                {/* Page stubs (null) — only for routing */}
                <div style={{ display: 'none' }}>{children}</div>
            </div>
        </div>
    );
}
