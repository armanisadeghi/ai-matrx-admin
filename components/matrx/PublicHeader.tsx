'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogIn } from 'lucide-react';

// Dynamic imports with SSR disabled - these load AFTER initial page render
const PublicHeaderAuth = dynamic(
    () => import('./PublicHeaderAuth').then(mod => ({ default: mod.PublicHeaderAuth })),
    { 
        ssr: false,
        loading: () => (
            <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs opacity-50 cursor-default"
                disabled
            >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign In</span>
            </Button>
        )
    }
);

const PublicHeaderFeedback = dynamic(
    () => import('./PublicHeaderFeedback').then(mod => ({ default: mod.PublicHeaderFeedback })),
    { 
        ssr: false,
        loading: () => null
    }
);

const PublicHeaderThemeToggle = dynamic(
    () => import('./PublicHeaderThemeToggle').then(mod => ({ default: mod.PublicHeaderThemeToggle })),
    { 
        ssr: false,
        loading: () => <div className="w-7 h-7" aria-hidden="true" />
    }
);

/**
 * Public Header - Server Component
 * 
 * Renders server-side for maximum performance. Interactive elements 
 * (theme toggle, auth button) are dynamically imported with ssr: false,
 * meaning they load AFTER the initial page render, not blocking it.
 * 
 * This ensures lightning-fast initial page loads on public routes.
 */
export function PublicHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm">
            <div className="w-full px-4 h-10 flex items-center justify-between">
                {/* Logo */}
                <Link 
                    href="/" 
                    className="flex items-center gap-2 group transition-opacity hover:opacity-80"
                >
                    <Image 
                        src="/matrx/matrx-icon.svg" 
                        width={24} 
                        height={24} 
                        alt="AI Matrx Logo" 
                        className="flex-shrink-0"
                        priority
                    />
                    <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600">
                        AI Matrx
                    </span>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Discover Link - Hidden on mobile */}
                    <Link href="/canvas/discover" className="hidden md:block">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className={cn(
                                "h-7 px-3 text-xs font-medium",
                                "text-zinc-600 dark:text-zinc-400",
                                "hover:text-zinc-900 dark:hover:text-zinc-100",
                                "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                                "transition-all duration-200"
                            )}
                        >
                            Discover
                        </Button>
                    </Link>

                    {/* Feedback Button - Dynamically loaded (ssr: false), only for authenticated users */}
                    <PublicHeaderFeedback />

                    {/* Theme Toggle - Dynamically loaded (ssr: false) */}
                    <PublicHeaderThemeToggle />

                    {/* Auth Button - Dynamically loaded (ssr: false) */}
                    <PublicHeaderAuth />
                </div>
            </div>
        </header>
    );
}

