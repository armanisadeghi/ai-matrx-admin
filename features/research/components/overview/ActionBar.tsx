'use client';

import { useState } from 'react';
import { Play, Search, Download, Brain, FileText, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActionBarProps {
    onRun: () => Promise<void> | void;
    onSearch: () => Promise<void> | void;
    onScrape: () => Promise<void> | void;
    onAnalyze: () => Promise<void> | void;
    onReport: () => Promise<void> | void;
    isStreaming: boolean;
}

const ACTIONS = [
    { key: 'run', label: 'Run', icon: Play, primary: true, tooltip: 'Run the full pipeline' },
    { key: 'search', label: 'Search', icon: Search, primary: false, tooltip: 'Search all keywords' },
    { key: 'scrape', label: 'Scrape', icon: Download, primary: false, tooltip: 'Scrape pending sources' },
    { key: 'analyze', label: 'Analyze', icon: Brain, primary: false, tooltip: 'Analyze unprocessed sources' },
    { key: 'report', label: 'Report', icon: FileText, primary: false, tooltip: 'Generate research report' },
] as const;

export function ActionBar({ onRun, onSearch, onScrape, onAnalyze, onReport, isStreaming }: ActionBarProps) {
    const [loadingKey, setLoadingKey] = useState<string | null>(null);

    const handlers: Record<string, () => Promise<void> | void> = {
        run: onRun, search: onSearch, scrape: onScrape, analyze: onAnalyze, report: onReport,
    };

    const handleClick = async (key: string) => {
        if (isStreaming || loadingKey) return;
        setLoadingKey(key);
        try {
            await handlers[key]();
        } catch {
            // Error handled by the stream/caller
        } finally {
            setLoadingKey(null);
        }
    };

    const isDisabled = isStreaming || loadingKey !== null;

    return (
        <div className="@container w-full">
            <div className="flex items-center gap-1 p-1 rounded-full mx-glass w-full">
                {ACTIONS.map((action) => {
                    const isThisLoading = loadingKey === action.key;
                    const Icon = action.icon;

                    return (
                        <Tooltip key={action.key}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => handleClick(action.key)}
                                    disabled={isDisabled}
                                    className={cn(
                                        'inline-flex flex-1 items-center justify-center gap-1.5 h-7 rounded-full text-[11px] font-medium transition-all',
                                        'disabled:opacity-40 disabled:pointer-events-none',
                                        action.primary
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : 'mx-glass-subtle text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {isThisLoading ? (
                                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                    ) : (
                                        <Icon className={cn('shrink-0', action.primary ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
                                    )}
                                    <span className="leading-none @[22rem]:inline hidden">{action.label}</span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">{isDisabled ? 'Please wait...' : action.tooltip}</TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}
