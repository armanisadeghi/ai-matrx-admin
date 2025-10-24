'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogIn } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function PublicHeader() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm">
            <div className="w-full px-4 h-14 flex items-center justify-between">
                {/* Logo */}
                <Link 
                    href="/" 
                    className="flex items-center gap-2 group transition-opacity hover:opacity-80"
                >
                    <Image 
                        src="/matrx/apple-touch-icon.png" 
                        width={28} 
                        height={28} 
                        alt="AI Matrx Logo" 
                        className="flex-shrink-0" 
                    />
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        AI Matrx
                    </span>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Discover Link - Hidden on mobile */}
                    <Link href="/canvas/discover" className="hidden sm:block">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Discover
                        </Button>
                    </Link>

                    {/* Theme Toggle */}
                    {mounted && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className={cn(
                                "w-9 h-9 p-0",
                                "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                                "transition-colors"
                            )}
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            ) : (
                                <Moon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            )}
                        </Button>
                    )}

                    {/* Sign In Button */}
                    <Link href="/sign-in">
                        <Button 
                            size="sm"
                            className="gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                        >
                            <LogIn className="h-4 w-4" />
                            <span className="hidden sm:inline">Sign In</span>
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}

