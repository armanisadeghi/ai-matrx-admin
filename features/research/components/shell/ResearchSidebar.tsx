'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Globe, FileText, Tags, Link2, Image, DollarSign, ChevronLeft } from 'lucide-react';
import { RESEARCH_NAV_ITEMS } from '../../constants';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
    LayoutDashboard, Globe, FileText, Tags, Link2, Image, DollarSign,
};

interface ResearchSidebarProps {
    projectId: string;
}

export function ResearchSidebar({ projectId }: ResearchSidebarProps) {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex w-48 flex-col border-r border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-2 px-3 h-12 border-b border-border">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/p/research">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <span className="text-sm font-semibold truncate">Research</span>
            </div>
            <nav className="flex-1 py-2 space-y-0.5 px-2">
                {RESEARCH_NAV_ITEMS.map((item) => {
                    const Icon = ICON_MAP[item.icon];
                    const href = item.href(projectId);
                    const isActive = item.key === 'overview'
                        ? pathname === href
                        : pathname.startsWith(href);

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
                                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="md:hidden">
                                {item.label}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </nav>
        </aside>
    );
}
