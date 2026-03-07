'use client';

// app/(ssr)/ssr/chat/_components/ChatSidebarClient.tsx
//
// Uses the feature/public-chat sidebar components directly.
// Navigation is handled via window.history.pushState + popstate event
// (same pattern used throughout the SSR chat workspace).

import { useState, useCallback } from 'react';
import { SidebarAgentHeader } from '@/features/public-chat/components/sidebar/SidebarAgentHeader';
import { SidebarActions } from '@/features/public-chat/components/sidebar/SidebarActions';
import { SidebarAgents } from '@/features/public-chat/components/sidebar/SidebarAgents';
import { SidebarChats } from '@/features/public-chat/components/sidebar/SidebarChats';
import { SidebarUserFooter } from '@/features/public-chat/components/sidebar/SidebarUserFooter';
import { useChatSidebar } from './ChatSidebarContext';

// ============================================================================
// NAVIGATION HELPERS — SSR chat uses history API, not Next.js router
// ============================================================================

function navigate(path: string) {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

// ============================================================================
// SIDEBAR HEADER — always pinned to the header zone (desktop)
// Shows collapse toggle + new chat at all times.
// The sidebar body starts with SidebarActions (no duplicate header row).
// ============================================================================

export function ChatSidebarHeader() {
    const { toggle } = useChatSidebar();

    const handleNewChat = useCallback(() => {
        navigate('/ssr/chat');
    }, []);

    return (
        <SidebarAgentHeader
            onCollapse={toggle}
            onNewChat={handleNewChat}
        />
    );
}

// ============================================================================
// SIDEBAR BODY — full sidebar content, only visible when open
// ============================================================================

export function ChatSidebarBody() {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSelectChat = useCallback((id: string) => {
        navigate(`/ssr/chat/${id}`);
    }, []);

    const handleNewChat = useCallback(() => {
        navigate('/ssr/chat');
    }, []);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Actions: New Chat, Generate, Search, Organization, Project, Tasks */}
            <SidebarActions
                onNewChat={handleNewChat}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* Scrollable: Agents + Chats */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                <SidebarAgents
                    searchQuery={searchQuery}
                />

                <SidebarChats
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                    searchQuery={searchQuery}
                />
            </div>

            {/* User footer — pinned to bottom */}
            <SidebarUserFooter />
        </div>
    );
}

export default function ChatSidebarClient() {
    return null;
}
