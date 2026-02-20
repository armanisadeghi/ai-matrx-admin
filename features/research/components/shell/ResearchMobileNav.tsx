'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Globe, FileText, Tags, MoreHorizontal,
    Search, Image, DollarSign, BookOpen, FlaskConical, Bot, Settings2,
} from 'lucide-react';
import { RESEARCH_NAV_ITEMS } from '../../constants';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
    LayoutDashboard, Globe, FileText, Tags, Search, Image, DollarSign,
    BookOpen, FlaskConical, Bot, Settings2,
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
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe px-4 pointer-events-none">
                <div className="flex items-center justify-around h-11 glass rounded-[22px] shadow-lg border border-white/[0.06] mb-1.5 pointer-events-auto">
                    {visibleItems.map((item) => {
                        const Icon = ICON_MAP[item.icon];
                        const href = item.href(topicId);
                        const isActive = item.key === 'topic'
                            ? pathname === href
                            : pathname.startsWith(href);

                        return (
                            <Link
                                key={item.key}
                                href={href}
                                className={cn(
                                    'flex flex-col items-center gap-px px-2.5 py-1 min-w-[44px] min-h-[44px] justify-center transition-colors',
                                    isActive ? 'text-primary' : 'text-muted-foreground/50',
                                )}
                            >
                                {Icon && <Icon className={cn('h-[18px] w-[18px]', isActive && 'drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]')} />}
                                <span className="text-[9px] font-medium leading-none">{item.label}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => setMoreOpen(true)}
                        className="flex flex-col items-center gap-px px-2.5 py-1 min-w-[44px] min-h-[44px] justify-center text-muted-foreground/50 transition-colors"
                    >
                        <MoreHorizontal className="h-[18px] w-[18px]" />
                        <span className="text-[9px] font-medium leading-none">More</span>
                    </button>
                </div>
            </nav>

            <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
                <DrawerContent className="max-h-[60dvh]">
                    <DrawerTitle className="sr-only">More options</DrawerTitle>
                    <div className="p-3 space-y-0.5 overflow-y-auto overscroll-contain pb-safe">
                        {hiddenItems.map((item) => {
                            const Icon = ICON_MAP[item.icon];
                            const href = item.href(topicId);
                            const isActive = item.key === 'topic'
                                ? pathname === href
                                : pathname.startsWith(href);

                            if (item.comingSoon) {
                                return (
                                    <div
                                        key={item.key}
                                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground/40 cursor-default"
                                    >
                                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                                        <span className="flex-1">{item.label}</span>
                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 font-normal">
                                            Soon
                                        </Badge>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.key}
                                    href={href}
                                    onClick={() => setMoreOpen(false)}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px]',
                                        isActive
                                            ? 'bg-primary/8 text-primary'
                                            : 'text-muted-foreground hover:bg-accent/50',
                                    )}
                                >
                                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
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
