'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSelector } from 'react-redux';
import {
    PanelLeft,
    SquarePen,
    ChevronDown,
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
import type { AgentConfig } from '../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface ChatMobileHeaderProps {
    onToggleSidebar: () => void;
    onNewChat: () => void;
    selectedAgent?: AgentConfig | null;
    onOpenAgentPicker: () => void;
}

// ============================================================================
// CHAT HEADER (all viewports)
// Transparent floating header — no background, icons overlay content.
// Replaces PublicHeader entirely on the chat route.
// Layout: [sidebar] [new chat] [agent name ▼] --- [logo] [discover] [menu]
// ============================================================================

export function ChatMobileHeader({
    onToggleSidebar,
    onNewChat,
    selectedAgent,
    onOpenAgentPicker,
}: ChatMobileHeaderProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const user = useSelector(selectUser);
    const isAuthenticated = !!user?.id;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const agentName = selectedAgent?.name || 'General Chat';

    return (
        <header className="absolute top-0 left-0 right-0 z-50 flex items-center h-10 px-1.5 pointer-events-none">
            {/* Left group: sidebar, new chat, agent selector */}
            <div className="flex items-center gap-0.5 min-w-0 flex-1 pointer-events-auto">
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
                {/* Agent name — opens unified picker */}
                <button
                    onClick={onOpenAgentPicker}
                    className="flex items-center gap-1 min-w-0 px-1.5 py-1 rounded-md hover:bg-accent/50 transition-colors"
                    title={`Switch agent: ${agentName}`}
                >
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                        {agentName}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </button>
            </div>

            {/* Right group: logo, discover, hamburger menu */}
            <div className="flex items-center gap-1 pointer-events-auto">
                {/* Discover link — desktop only */}
                <Link
                    href="/canvas/discover"
                    className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                    <Compass className="h-3.5 w-3.5" />
                    Discover
                </Link>

                {/* Hamburger menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0">
                            <Menu className="h-[18px] w-[18px]" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={4} className="w-44">
                        {/* Discover — visible in menu on mobile only */}
                        <DropdownMenuItem asChild className="md:hidden">
                            <Link href="/canvas/discover" className="flex items-center gap-2">
                                <Compass className="h-4 w-4" />
                                Discover
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="md:hidden" />

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

                {/* Logo — rightmost element */}
                <Link
                    href="/"
                    className="p-2 rounded-md transition-opacity hover:opacity-70 flex-shrink-0"
                    title="AI Matrx Home"
                >
                    <Image
                        src="/matrx/matrx-icon.svg"
                        width={16}
                        height={16}
                        alt="AI Matrx"
                        className="flex-shrink-0"
                    />
                </Link>
            </div>
        </header>
    );
}

export default ChatMobileHeader;
