'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, X, FilterX, BrainCircuit, Plus, RefreshCcw } from 'lucide-react';
import type { AiModelFilters, TabState } from '../hooks/useTabUrlState';

export const ALL_PROVIDERS = [
    'AI Matrx',
    'Anthropic',
    'Black Forest',
    'DeepSeek',
    'Google',
    'Groq',
    'Meta',
    'Microsoft',
    'Mixtral',
    'OpenAI',
    'Qwen',
    'Together',
    'WAN',
    'XAI',
    'cerebras_chat',
];

interface AiModelFilterBarProps {
    tabState: TabState;
    totalCount: number;
    filteredCount: number;
    onUpdateQ: (q: string) => void;
    onUpdateFilters: (filters: Partial<AiModelFilters>) => void;
    onClearAll: () => void;
    onCreate: () => void;
    onRefresh: () => void;
}

const DEBOUNCE_MS = 250;

export default function AiModelFilterBar({
    tabState,
    totalCount,
    filteredCount,
    onUpdateQ,
    onUpdateFilters,
    onClearAll,
    onCreate,
    onRefresh,
}: AiModelFilterBarProps) {
    const { q, filters } = tabState;

    // Local debounced search state — so typing is always instant in the input
    const [localQ, setLocalQ] = useState(q);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep local state in sync when tab switches (q changes externally)
    useEffect(() => {
        setLocalQ(q);
    }, [q]);

    const handleSearchChange = (value: string) => {
        setLocalQ(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onUpdateQ(value);
        }, DEBOUNCE_MS);
    };

    const handleClearSearch = () => {
        setLocalQ('');
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onUpdateQ('');
    };

    // Local api_class with debounce
    const [apiClassInput, setApiClassInput] = useState(filters.api_class ?? '');
    const apiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setApiClassInput(filters.api_class ?? '');
    }, [filters.api_class]);

    const handleApiClassChange = (value: string) => {
        setApiClassInput(value);
        if (apiDebounceRef.current) clearTimeout(apiDebounceRef.current);
        apiDebounceRef.current = setTimeout(() => {
            onUpdateFilters({ api_class: value.trim() || undefined });
        }, DEBOUNCE_MS);
    };

    const activeFilterCount = [
        filters.provider,
        filters.is_deprecated !== undefined,
        filters.is_primary !== undefined,
        filters.is_premium !== undefined,
        filters.api_class,
    ].filter(Boolean).length;

    const hasAny = !!(q || activeFilterCount > 0);

    return (
        <div className="flex-shrink-0 border-b bg-card">
            {/*
              Single horizontal strip — nowrap + overflow-x-auto so it never
              stacks into multiple rows but scrolls when space is tight.
            */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto">

                {/* ── Brand/title ─────────────────────────────────────── */}
                <div className="flex items-center gap-1.5 shrink-0 mr-1">
                    <BrainCircuit className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold whitespace-nowrap">AI Models</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0 font-mono">
                        {filteredCount === totalCount
                            ? totalCount
                            : `${filteredCount}/${totalCount}`}
                    </Badge>
                </div>

                {/* ── Divider ─────────────────────────────────────────── */}
                <div className="w-px h-5 bg-border shrink-0" />

                {/* ── Search ──────────────────────────────────────────── */}
                <div className="relative shrink-0">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        value={localQ}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search…"
                        className="h-7 pl-7 pr-6 text-xs w-40"
                    />
                    {localQ && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* ── Provider ────────────────────────────────────────── */}
                <Select
                    value={filters.provider ?? '__all__'}
                    onValueChange={(v) => onUpdateFilters({ provider: v === '__all__' ? undefined : v })}
                >
                    <SelectTrigger className="h-7 text-xs w-32 shrink-0">
                        <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">All Providers</SelectItem>
                        {ALL_PROVIDERS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* ── Deprecated ──────────────────────────────────────── */}
                <Select
                    value={
                        filters.is_deprecated === true ? 'true'
                        : filters.is_deprecated === false ? 'false'
                        : '__all__'
                    }
                    onValueChange={(v) =>
                        onUpdateFilters({ is_deprecated: v === '__all__' ? undefined : v === 'true' })
                    }
                >
                    <SelectTrigger className="h-7 text-xs w-28 shrink-0">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">All Status</SelectItem>
                        <SelectItem value="false">Active</SelectItem>
                        <SelectItem value="true">Deprecated</SelectItem>
                    </SelectContent>
                </Select>

                {/* ── Primary ─────────────────────────────────────────── */}
                <Select
                    value={
                        filters.is_primary === true ? 'true'
                        : filters.is_primary === false ? 'false'
                        : '__all__'
                    }
                    onValueChange={(v) =>
                        onUpdateFilters({ is_primary: v === '__all__' ? undefined : v === 'true' })
                    }
                >
                    <SelectTrigger className="h-7 text-xs w-24 shrink-0">
                        <SelectValue placeholder="Primary" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        <SelectItem value="true">Primary</SelectItem>
                        <SelectItem value="false">Non-primary</SelectItem>
                    </SelectContent>
                </Select>

                {/* ── Premium ─────────────────────────────────────────── */}
                <Select
                    value={
                        filters.is_premium === true ? 'true'
                        : filters.is_premium === false ? 'false'
                        : '__all__'
                    }
                    onValueChange={(v) =>
                        onUpdateFilters({ is_premium: v === '__all__' ? undefined : v === 'true' })
                    }
                >
                    <SelectTrigger className="h-7 text-xs w-24 shrink-0">
                        <SelectValue placeholder="Premium" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        <SelectItem value="true">Premium</SelectItem>
                        <SelectItem value="false">Non-premium</SelectItem>
                    </SelectContent>
                </Select>

                {/* ── API Class ───────────────────────────────────────── */}
                <Input
                    value={apiClassInput}
                    onChange={(e) => handleApiClassChange(e.target.value)}
                    placeholder="API class…"
                    className="h-7 text-xs w-28 font-mono shrink-0"
                />

                {/* ── Clear filters ────────────────────────────────────── */}
                {hasAny && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={onClearAll}
                        title="Clear all filters"
                    >
                        <FilterX className="h-3.5 w-3.5" />
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="h-4 px-1 text-xs">
                                {activeFilterCount + (q ? 1 : 0)}
                            </Badge>
                        )}
                    </Button>
                )}

                {/* ── Spacer pushes actions to the right ──────────────── */}
                <div className="flex-1 min-w-2" />

                {/* ── Actions ─────────────────────────────────────────── */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={onRefresh}
                    title="Refresh"
                >
                    <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={onCreate}
                    title="New Model"
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
