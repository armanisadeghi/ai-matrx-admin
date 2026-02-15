'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSelector } from 'react-redux';
import {
    PanelLeft,
    SquarePen,
    Menu,
    Compass,
    Sun,
    Moon,
    LogIn,
    LayoutDashboard,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { SidebarAgentHeader } from './sidebar/SidebarAgentHeader';
import type { AgentConfig } from '../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface ChatMobileHeaderProps {
    onToggleSidebar: () => void;
    onNewChat: () => void;
    selectedAgent?: AgentConfig | null;
    onAgentSelect?: (agent: AgentConfig) => void;
}

// ============================================================================
// CHAT MOBILE HEADER
// Consolidated header for mobile: replaces PublicHeader + ChatSidebar sub-header
// Layout: [drawer] [new chat] [agent selector] --- [hamburger menu]
// ============================================================================

export function ChatMobileHeader({
    onToggleSidebar,
    onNewChat,
    selectedAgent,
    onAgentSelect,
}: ChatMobileHeaderProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const user = useSelector(selectUser);
    const isAuthenticated = !!user?.id;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <header className="flex md:hidden items-center h-10 px-1.5 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0">
            {/* Left group: drawer, new chat, agent selector */}
            <div className="flex items-center gap-0.5 min-w-0 flex-1">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
                    title="Open sidebar"
                >
                    <PanelLeft className="h-[18px] w-[18px]" />
                </button>
                <button
                    onClick={onNewChat}
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
                    title="New chat"
                >
                    <SquarePen className="h-[18px] w-[18px]" />
                </button>
                <div className="min-w-0 flex-1">
                    <SidebarAgentHeader
                        selectedAgent={selectedAgent}
                        onAgentSelect={onAgentSelect}
                        compact
                    />
                </div>
            </div>

            {/* Right: hamburger menu with all other options */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0">
                        <Menu className="h-[18px] w-[18px]" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={4} className="w-44">
                    <DropdownMenuItem asChild>
                        <Link href="/canvas/discover" className="flex items-center gap-2">
                            <Compass className="h-4 w-4" />
                            Discover
                        </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Theme toggle */}
                    {mounted && (
                        <DropdownMenuItem
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="flex items-center gap-2"
                        >
                            {theme === 'dark' ? (
                                <>
                                    <Sun className="h-4 w-4" />
                                    Light Mode
                                </>
                            ) : (
                                <>
                                    <Moon className="h-4 w-4" />
                                    Dark Mode
                                </>
                            )}
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Auth */}
                    {isAuthenticated ? (
                        <DropdownMenuItem
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem
                            onClick={() => router.push('/login')}
                            className="flex items-center gap-2"
                        >
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}

export default ChatMobileHeader;
