'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Globe, FileText, Tags, Search, Image, DollarSign,
    ChevronLeft, BookOpen, FlaskConical, Bot, Settings2,
} from 'lucide-react';
import { RESEARCH_NAV_ITEMS } from '../../constants';
import { Button } from '@/components/ui/button';
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
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/50 cursor-default select-none"
                >
                    {Icon && <Icon className="h-4 w-4 shrink-0 mt-0.5" />}
                    <span className="truncate flex-1">{item.label}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal shrink-0">
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
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        {Icon && <Icon className="h-4 w-4 shrink-0 mt-0.5" />}
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
        <aside className="hidden md:flex w-48 flex-col border-r border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-2 px-3 h-12 border-b border-border">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/p/research/topics">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <span className="text-sm font-semibold truncate">Research</span>
            </div>
            <nav className="flex-1 py-2 px-2 overflow-y-auto">
                {/* Primary pipeline steps */}
                <div className="space-y-0.5">
                    {primaryItems.map(renderItem)}
                </div>

                {/* Divider */}
                <div className="mx-1 my-2 h-px bg-border" />

                {/* Secondary utility tabs */}
                <div className="space-y-0.5">
                    {secondaryItems.map(renderItem)}
                </div>
            </nav>
        </aside>
    );
}
