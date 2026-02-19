'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Globe, FileText, Tags, MoreHorizontal, Search, Image, DollarSign } from 'lucide-react';
import { RESEARCH_NAV_ITEMS } from '../../constants';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
    LayoutDashboard, Globe, FileText, Tags, Search, Image, DollarSign,
};

interface ResearchMobileNavProps {
    topicId: string;
}

export function ResearchMobileNav({ topicId }: ResearchMobileNavProps) {
    const pathname = usePathname();
    const [moreOpen, setMoreOpen] = useState(false);

    const visibleItems = RESEARCH_NAV_ITEMS.filter(i => i.mobileVisible);
    const hiddenItems = RESEARCH_NAV_ITEMS.filter(i => !i.mobileVisible);

    return (
        <>
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe">
                <div className="flex items-center justify-around h-14">
                    {visibleItems.map((item) => {
                        const Icon = ICON_MAP[item.icon];
                        const href = item.href(topicId);
                        const isActive = item.key === 'overview'
                            ? pathname === href
                            : pathname.startsWith(href);

                        return (
                            <Link
                                key={item.key}
                                href={href}
                                className={cn(
                                    'flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[44px] min-h-[44px] justify-center',
                                    isActive ? 'text-primary' : 'text-muted-foreground',
                                )}
                            >
                                {Icon && <Icon className="h-5 w-5" />}
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => setMoreOpen(true)}
                        className={cn(
                            'flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[44px] min-h-[44px] justify-center',
                            'text-muted-foreground',
                        )}
                    >
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </nav>

            <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
                <DrawerContent className="max-h-[50dvh]">
                    <DrawerTitle className="sr-only">More options</DrawerTitle>
                    <div className="p-4 space-y-1">
                        {hiddenItems.map((item) => {
                            const Icon = ICON_MAP[item.icon];
                            const href = item.href(topicId);
                            const isActive = pathname.startsWith(href);

                            return (
                                <Link
                                    key={item.key}
                                    href={href}
                                    onClick={() => setMoreOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-accent',
                                    )}
                                >
                                    {Icon && <Icon className="h-5 w-5" />}
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    );
}
