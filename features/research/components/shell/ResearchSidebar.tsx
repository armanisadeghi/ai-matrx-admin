'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Globe, FileText, Tags, Search, Image, DollarSign,
    ChevronLeft, BookOpen, FlaskConical, Bot, Settings2,
} from 'lucide-react';
import { RESEARCH_NAV_ITEMS } from '../../constants';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
    LayoutDashboard, Globe, FileText, Tags, Search, Image, DollarSign,
    BookOpen, FlaskConical, Bot, Settings2,
};

interface ResearchSidebarProps {
    topicId: string;
}

export function ResearchSidebar({ topicId }: ResearchSidebarProps) {
    const pathname = usePathname();

    const primaryItems = RESEARCH_NAV_ITEMS.filter(i => i.group === 'primary');
    const secondaryItems = RESEARCH_NAV_ITEMS.filter(i => i.group === 'secondary');

    const renderItem = (item: typeof RESEARCH_NAV_ITEMS[number]) => {
        const Icon = ICON_MAP[item.icon];
        const href = item.href(topicId);
        const isActive = item.key === 'topic'
            ? pathname === href
            : pathname.startsWith(href);

        if (item.comingSoon) {
            return (
                <div
                    key={item.key}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground/40 cursor-default select-none"
                >
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate flex-1">{item.label}</span>
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 font-normal shrink-0">
                        Soon
                    </Badge>
                </div>
            );
        }

        return (
            <Tooltip key={item.key} delayDuration={300}>
                <TooltipTrigger asChild>
                    <Link
                        href={href}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                            isActive
                                ? 'bg-primary/8 text-primary'
                                : 'text-muted-foreground/70 hover:bg-accent/50 hover:text-foreground',
                        )}
                    >
                        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{item.label}</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    };

    return (
        <aside className="hidden md:flex w-44 flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 h-10 border-b border-border/50">
                <Link
                    href="/p/research/topics"
                    className="inline-flex items-center justify-center h-6 w-6 rounded-full glass-subtle text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
                <span className="text-xs font-semibold truncate">Research</span>
            </div>
            <nav className="flex-1 py-1.5 px-1.5 overflow-y-auto">
                <div className="space-y-px">
                    {primaryItems.map(renderItem)}
                </div>

                <div className="mx-1 my-1.5 h-px bg-border/30" />

                <div className="space-y-px">
                    {secondaryItems.map(renderItem)}
                </div>
            </nav>
        </aside>
    );
}
