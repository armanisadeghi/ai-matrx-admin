import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PublicHeaderAuth } from './PublicHeaderAuth';
import { PublicHeaderThemeToggle } from './PublicHeaderThemeToggle';

/**
 * Public Header - Server Component
 * 
 * Renders server-side for maximum performance. Only interactive elements 
 * (theme toggle, auth button) are client components that hydrate after page load.
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
                        src="/matrx/apple-touch-icon.png" 
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

                    {/* Theme Toggle - Client Component (lazy hydrates) */}
                    <PublicHeaderThemeToggle />

                    {/* Auth-Aware Button - Client Component (lazy hydrates) */}
                    <PublicHeaderAuth />
                </div>
            </div>
        </header>
    );
}

