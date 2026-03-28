'use client';

import React from 'react';
import type { ClientSite } from '@/features/content-manager/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Globe } from 'lucide-react';

interface SiteSelectorProps {
    sites: ClientSite[];
    activeSiteId: string | null;
    onSelect: (siteId: string) => void;
}

export default function SiteSelector({ sites, activeSiteId, onSelect }: SiteSelectorProps) {
    const activeSite = sites.find((s) => s.id === activeSiteId);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                    <Globe className="h-3 w-3" />
                    {activeSite?.name ?? 'Select site'}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                {sites.map((site) => (
                    <DropdownMenuItem
                        key={site.id}
                        onClick={() => onSelect(site.id)}
                        className={site.id === activeSiteId ? 'font-medium bg-accent' : ''}
                    >
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{site.name}</span>
                            <span className="text-[10px] text-muted-foreground">{site.slug}</span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
