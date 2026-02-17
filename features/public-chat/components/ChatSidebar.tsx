'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { AgentConfig } from '../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatSidebarProps {
    activeRequestId?: string | null;
    onSelectChat: (requestId: string) => void;
    onNewChat: () => void;
    onAgentSelect?: (agent: AgentConfig) => void;
    /** Opens the unified agent picker (bottom sheet / dialog) */
    onOpenAgentPicker?: () => void;
    selectedAgent?: AgentConfig | null;
    /** Controlled open state (lifted from parent for mobile header coordination) */
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    className?: string;
}

// ============================================================================
// LAZY-LOADED SECTIONS (ssr: false — zero impact on initial page load)
// ============================================================================

const SidebarAgentHeader = dynamic(
    () => import('./sidebar/SidebarAgentHeader'),
    { ssr: false, loading: () => <div className="h-9 border-b border-border" /> }
);

const SidebarActions = dynamic(
    () => import('./sidebar/SidebarActions'),
    { ssr: false, loading: () => <div className="h-[168px] border-b border-border" /> }
);

const SidebarAgents = dynamic(
    () => import('./sidebar/SidebarAgents'),
    { ssr: false, loading: () => <div className="h-20 border-b border-border" /> }
);

const SidebarChats = dynamic(
    () => import('./sidebar/SidebarChats'),
    { ssr: false, loading: () => <div className="min-h-[80px]" /> }
);

const SidebarUserFooter = dynamic(
    () => import('./sidebar/SidebarUserFooter'),
    { ssr: false, loading: () => <div className="h-11 border-t border-border" /> }
);

// ============================================================================
// CHAT SIDEBAR SHELL
// ============================================================================

export function ChatSidebar({
    activeRequestId,
    onSelectChat,
    onNewChat,
    onAgentSelect,
    onOpenAgentPicker,
    selectedAgent,
    isOpen,
    onOpenChange,
    className = '',
}: ChatSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const toggleSidebar = useCallback(() => {
        onOpenChange(!isOpen);
    }, [isOpen, onOpenChange]);

    const closeSidebar = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    const handleNewChat = useCallback(() => {
        onNewChat();
        closeSidebar();
    }, [onNewChat, closeSidebar]);

    // Shared sidebar content rendered inside both mobile and desktop panels
    const sidebarContent = (
        <div className="h-full flex flex-col">
            {/* Section 0: Agent Header — opens unified picker */}
            <SidebarAgentHeader
                selectedAgent={selectedAgent}
                onAgentSelect={onOpenAgentPicker ? () => onOpenAgentPicker() : onAgentSelect}
            />

            {/* Section 1: Actions — fixed at top */}
            <SidebarActions
                onNewChat={handleNewChat}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* Scrollable middle: Agents + Chats together */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                {/* Section 2: Agents — direct selection (already shows full list) */}
                <SidebarAgents
                    selectedAgent={selectedAgent}
                    onAgentSelect={onAgentSelect}
                    searchQuery={searchQuery}
                />

                {/* Section 3: Chats */}
                <SidebarChats
                    activeRequestId={activeRequestId}
                    onSelectChat={onSelectChat}
                    onNewChat={onNewChat}
                    searchQuery={searchQuery}
                    onCloseSidebar={closeSidebar}
                />
            </div>

            {/* Section 4: User Footer — pinned to bottom */}
            <SidebarUserFooter />
        </div>
    );

    return (
        <>
            {/* ── Desktop: Fixed toggle button — hidden on mobile (now handled by floating header) ── */}
            {/* Toggle button removed — sidebar toggle is in the floating ChatMobileHeader on all viewports */}

            {/* Desktop floating agent selector removed — now in the floating ChatMobileHeader */}

            {/* ── Overlay backdrop (all viewports) ── */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={closeSidebar}
            />

            {/* ── Mobile drawer ── */}
            <div
                className={`fixed left-0 top-0 bottom-0 w-[272px] z-40 bg-card border-r border-border shadow-xl md:hidden transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {sidebarContent}
            </div>

            {/* ── Desktop panel ── */}
            <div
                className={`hidden md:block fixed left-0 top-0 bottom-0 w-[256px] bg-card border-r border-border z-40 transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {sidebarContent}
            </div>
        </>
    );
}

export default ChatSidebar;
