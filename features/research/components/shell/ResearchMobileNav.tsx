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
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe px-4">
                <div className="flex items-center justify-around h-14 glass rounded-2xl shadow-lg border border-border/50 mb-2">
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
                                    'flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center',
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
                        className="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-muted-foreground"
                    >
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </nav>

            <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
                <DrawerContent className="max-h-[60dvh]">
                    <DrawerTitle className="sr-only">More options</DrawerTitle>
                    <div className="p-4 space-y-1 overflow-y-auto overscroll-contain pb-safe">
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
                                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground/50 cursor-default"
                                    >
                                        {Icon && <Icon className="h-5 w-5 shrink-0" />}
                                        <span className="flex-1">{item.label}</span>
                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
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
                                        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-accent',
                                    )}
                                >
                                    {Icon && <Icon className="h-5 w-5 shrink-0" />}
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
