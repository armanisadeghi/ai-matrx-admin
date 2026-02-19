'use client';

import { useState } from 'react';
import { Play, Search, Download, Brain, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

interface ActionBarProps {
    onRun: () => Promise<void> | void;
    onSearch: () => Promise<void> | void;
    onScrape: () => Promise<void> | void;
    onAnalyze: () => Promise<void> | void;
    onReport: () => Promise<void> | void;
    isStreaming: boolean;
}

const ACTIONS = [
    { key: 'run', label: 'Run Research', icon: Play, variant: 'default' as const, tooltip: 'Run the full pipeline: search, scrape, analyze, and generate report' },
    { key: 'search', label: 'Search', icon: Search, variant: 'outline' as const, tooltip: 'Search all keywords' },
    { key: 'scrape', label: 'Scrape', icon: Download, variant: 'outline' as const, tooltip: 'Scrape pending sources' },
    { key: 'analyze', label: 'Analyze', icon: Brain, variant: 'outline' as const, tooltip: 'Analyze all unprocessed sources' },
    { key: 'report', label: 'Report', icon: FileText, variant: 'outline' as const, tooltip: 'Generate research report' },
] as const;

export function ActionBar({ onRun, onSearch, onScrape, onAnalyze, onReport, isStreaming }: ActionBarProps) {
    const isMobile = useIsMobile();
    const [loadingKey, setLoadingKey] = useState<string | null>(null);

    const handlers: Record<string, () => Promise<void> | void> = {
        run: onRun,
        search: onSearch,
        scrape: onScrape,
        analyze: onAnalyze,
        report: onReport,
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
        <div className="flex flex-wrap gap-2">
            {ACTIONS.map(action => {
                const isThisLoading = loadingKey === action.key;

                return (
                    <Tooltip key={action.key}>
                        <TooltipTrigger asChild>
                            <Button
                                variant={action.variant}
                                size={isMobile ? 'sm' : 'default'}
                                onClick={() => handleClick(action.key)}
                                disabled={isDisabled}
                                className="gap-2 min-h-[44px] sm:min-h-0"
                            >
                                {isThisLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <action.icon className="h-4 w-4" />
                                )}
                                {isMobile ? null : action.label}
                                {isMobile && <span className="sr-only">{action.label}</span>}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isDisabled ? 'Please wait...' : action.tooltip}</TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}
