'use client';

import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useState } from 'react';
import { SCRAPE_STATUS_CONFIG, SOURCE_TYPE_CONFIG, ORIGIN_CONFIG } from '../../constants';
import type { ResearchKeyword, SourceFilters as Filters } from '../../types';

interface SourceFiltersProps {
    filters: Filters;
    onFilterChange: (updates: Partial<Filters>) => void;
    onReset: () => void;
    hasActiveFilters: boolean;
    keywords: ResearchKeyword[];
    hostnames: string[];
}

export function SourceFilters({ filters, onFilterChange, onReset, hasActiveFilters, keywords, hostnames }: SourceFiltersProps) {
    const isMobile = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const filterContent = (
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Select value={filters.keyword_id ?? 'all'} onValueChange={v => onFilterChange({ keyword_id: v === 'all' ? undefined : v })}>
                <SelectTrigger className="w-full sm:w-40 text-base sm:text-sm" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Keyword" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Keywords</SelectItem>
                    {keywords.map(kw => (
                        <SelectItem key={kw.id} value={kw.id}>{kw.keyword}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filters.scrape_status ?? 'all'} onValueChange={v => onFilterChange({ scrape_status: v === 'all' ? undefined : v as Filters['scrape_status'] })}>
                <SelectTrigger className="w-full sm:w-36 text-base sm:text-sm" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(SCRAPE_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filters.source_type ?? 'all'} onValueChange={v => onFilterChange({ source_type: v === 'all' ? undefined : v as Filters['source_type'] })}>
                <SelectTrigger className="w-full sm:w-32 text-base sm:text-sm" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(SOURCE_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filters.origin ?? 'all'} onValueChange={v => onFilterChange({ origin: v === 'all' ? undefined : v as Filters['origin'] })}>
                <SelectTrigger className="w-full sm:w-32 text-base sm:text-sm" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Origin" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Origins</SelectItem>
                    {Object.entries(ORIGIN_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {hostnames.length > 0 && (
                <Select value={filters.hostname ?? 'all'} onValueChange={v => onFilterChange({ hostname: v === 'all' ? undefined : v })}>
                    <SelectTrigger className="w-full sm:w-40 text-base sm:text-sm" style={{ fontSize: '16px' }}>
                        <SelectValue placeholder="Hostname" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Hosts</SelectItem>
                        {hostnames.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 min-h-[44px] sm:min-h-0">
                    <X className="h-3.5 w-3.5" />
                    Clear
                </Button>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <>
                <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)} className="gap-2 min-h-[44px]">
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
                </Button>
                <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <DrawerContent className="max-h-[75dvh]">
                        <DrawerTitle className="px-4 pt-4 text-base font-semibold">Filter Sources</DrawerTitle>
                        <div className="p-4 space-y-3 pb-safe">
                            {filterContent}
                        </div>
                    </DrawerContent>
                </Drawer>
            </>
        );
    }

    return filterContent;
}
