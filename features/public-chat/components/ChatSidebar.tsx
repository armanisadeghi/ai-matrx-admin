'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PanelLeft } from 'lucide-react';
import type { AgentConfig } from '../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatSidebarProps {
    activeRequestId?: string | null;
    onSelectChat: (requestId: string) => void;
    onNewChat: () => void;
    onAgentSelect?: (agent: AgentConfig) => void;
    selectedAgent?: AgentConfig | null;
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
    selectedAgent,
    className = '',
}: ChatSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleSidebar = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleNewChat = useCallback(() => {
        onNewChat();
        closeSidebar();
    }, [onNewChat, closeSidebar]);

    // Shared sidebar content rendered inside both mobile and desktop panels
    const sidebarContent = (
        <div className="h-full flex flex-col">
            {/* Section 0: Agent Header — fixed at top */}
            <SidebarAgentHeader
                selectedAgent={selectedAgent}
                onAgentSelect={onAgentSelect}
            />

            {/* Section 1: Actions — fixed at top */}
            <SidebarActions
                onNewChat={handleNewChat}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* Scrollable middle: Agents + Chats together */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                {/* Section 2: Agents */}
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
            {/* ── Desktop: Fixed toggle button — hidden on mobile ── */}
            <button
                onClick={toggleSidebar}
                className={`hidden md:flex fixed top-[2.875rem] left-2 z-50 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-300 ease-in-out ${
                    isOpen
                        ? 'bg-transparent hover:bg-accent/60'
                        : 'bg-card border border-border hover:bg-accent'
                } ${className}`}
                title={isOpen ? 'Close sidebar' : 'Open chat history'}
            >
                <PanelLeft
                    className={`h-4 w-4 transition-transform duration-300 ease-in-out ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                />
            </button>

            {/* ── Desktop: Floating agent selector — visible only when sidebar is closed ── */}
            <div className={`hidden md:block transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <SidebarAgentHeader
                    selectedAgent={selectedAgent}
                    onAgentSelect={onAgentSelect}
                    floating
                />
            </div>

            {/* ── Mobile: Sub-header bar with toggle + agent selector ── */}
            <div className="flex md:hidden items-center gap-1 px-2 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm">
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
                    title="Open sidebar"
                >
                    <PanelLeft className="h-4 w-4" />
                </button>
                <SidebarAgentHeader
                    selectedAgent={selectedAgent}
                    onAgentSelect={onAgentSelect}
                    compact
                />
            </div>

            {/* ── Mobile overlay backdrop ── */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300 ${
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
                className={`hidden md:block fixed left-0 top-10 bottom-0 w-[256px] bg-card border-r border-border z-30 transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {sidebarContent}
            </div>
        </>
    );
}

export default ChatSidebar;
