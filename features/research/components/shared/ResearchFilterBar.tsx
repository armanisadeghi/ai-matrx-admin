'use client';

import { type ReactNode, useState } from 'react';
import { Search, X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HierarchyFilterPill, type FilterOption } from '@/components/hierarchy-filter';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

export interface FilterDef {
    key: string;
    label: string;
    allLabel: string;
    options: FilterOption[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

interface ResearchFilterBarProps {
    title: string;
    count?: string;
    filters: FilterDef[];
    search?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    trailing?: ReactNode;
    className?: string;
}

export function ResearchFilterBar({
    title,
    count,
    filters,
    search,
    onSearchChange,
    searchPlaceholder = 'Search...',
    trailing,
    className,
}: ResearchFilterBarProps) {
    const isMobile = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const showSearch = onSearchChange !== undefined;
    const hasActiveFilters = filters.some(f => f.selectedId !== null);

    const resetAll = () => {
        for (const f of filters) f.onSelect(null);
    };

    const pills = filters.map(f => (
        <HierarchyFilterPill
            key={f.key}
            label={f.label}
            allLabel={f.allLabel}
            options={f.options}
            selectedId={f.selectedId}
            onSelect={f.onSelect}
        />
    ));

    return (
        <>
            <div className={cn('flex items-center gap-1.5 p-1 rounded-full glass', className)}>
                <span className="text-[11px] font-medium text-foreground/80 pl-1.5 shrink-0">{title}</span>
                {count && (
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{count}</span>
                )}

                {!isMobile && pills}

                {hasActiveFilters && !isMobile && (
                    <button
                        onClick={resetAll}
                        className="inline-flex items-center justify-center h-5 w-5 rounded-full glass-subtle text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        aria-label="Reset filters"
                    >
                        <RotateCcw className="h-2.5 w-2.5" />
                    </button>
                )}

                {showSearch && (
                    <>
                        <div className="w-px h-4 bg-border/30 mx-0.5 hidden sm:block" />
                        <div className="flex-1 flex items-center gap-1.5 min-w-0 h-6 px-2 rounded-full glass-subtle">
                            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                            <input
                                type="text"
                                value={search ?? ''}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground"
                                style={{ fontSize: '16px' }}
                            />
                            {search && (
                                <button
                                    onClick={() => onSearchChange?.('')}
                                    className="shrink-0 p-0.5 rounded-full hover:bg-muted/50 transition-colors"
                                >
                                    <X className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    </>
                )}

                {isMobile && filters.length > 0 && (
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className={cn(
                            'inline-flex items-center justify-center h-6 w-6 rounded-full glass-subtle transition-colors relative shrink-0',
                            hasActiveFilters ? 'text-primary' : 'text-muted-foreground',
                        )}
                    >
                        <SlidersHorizontal className="h-3 w-3" />
                        {hasActiveFilters && (
                            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                    </button>
                )}

                {trailing}
            </div>

            {isMobile && filters.length > 0 && (
                <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <DrawerContent className="max-h-[75dvh]">
                        <DrawerTitle className="px-4 pt-3 text-xs font-semibold">Filters</DrawerTitle>
                        <div className="p-4 space-y-2 pb-safe">
                            {filters.map(f => (
                                <div key={f.key} className="flex items-center gap-2">
                                    <span className="text-[11px] text-muted-foreground w-16 shrink-0">{f.label}</span>
                                    <HierarchyFilterPill
                                        label={f.label}
                                        allLabel={f.allLabel}
                                        options={f.options}
                                        selectedId={f.selectedId}
                                        onSelect={(id) => { f.onSelect(id); }}
                                    />
                                </div>
                            ))}
                            {hasActiveFilters && (
                                <button
                                    onClick={() => { resetAll(); setDrawerOpen(false); }}
                                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full glass-subtle text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-2 min-h-[44px]"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Reset All
                                </button>
                            )}
                        </div>
                    </DrawerContent>
                </Drawer>
            )}
        </>
    );
}
