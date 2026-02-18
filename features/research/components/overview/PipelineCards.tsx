'use client';

import { Search, Globe, FileText, Brain, Layers, Tags, File, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { SCRAPE_STATUS_CONFIG } from '../../constants';
import type { ResearchProgress, ScrapeStatus } from '../../types';

interface PipelineCardsProps {
    progress: ResearchProgress | null;
}

interface CardProps {
    icon: typeof Search;
    label: string;
    children: React.ReactNode;
}

function StatCard({ icon: Icon, label, children }: CardProps) {
    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            {children}
        </div>
    );
}

export function PipelineCards({ progress }: PipelineCardsProps) {
    if (!progress) return null;

    const analysisPercent = progress.total_eligible_for_analysis > 0
        ? Math.round((progress.total_analyses / progress.total_eligible_for_analysis) * 100)
        : 0;

    const synthPercent = progress.total_keywords > 0
        ? Math.round((progress.keyword_syntheses / progress.total_keywords) * 100)
        : 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={Search} label="Keywords">
                <div className="text-2xl font-bold">{progress.total_keywords}</div>
                {progress.stale_keywords > 0 && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        {progress.stale_keywords} stale
                    </span>
                )}
            </StatCard>

            <StatCard icon={Globe} label="Sources">
                <div className="text-2xl font-bold">{progress.total_sources}</div>
                <div className="text-xs text-muted-foreground">{progress.included_sources} included</div>
                {progress.sources_by_status && (
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted mt-1">
                        {(Object.entries(progress.sources_by_status) as [ScrapeStatus, number][])
                            .filter(([, count]) => count > 0)
                            .map(([status, count]) => (
                                <div
                                    key={status}
                                    className="h-full"
                                    style={{
                                        width: `${(count / progress.total_sources) * 100}%`,
                                        backgroundColor: SCRAPE_STATUS_CONFIG[status]?.color ?? '#6b7280',
                                    }}
                                />
                            ))}
                    </div>
                )}
            </StatCard>

            <StatCard icon={FileText} label="Content">
                <div className="text-2xl font-bold">{progress.total_content}</div>
                <div className="text-xs text-muted-foreground">pages scraped</div>
            </StatCard>

            <StatCard icon={Brain} label="Analyses">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{progress.total_analyses}</span>
                    <span className="text-sm text-muted-foreground">/ {progress.total_eligible_for_analysis}</span>
                </div>
                <Progress value={analysisPercent} className="h-2" />
            </StatCard>

            <StatCard icon={Layers} label="Keyword Syntheses">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{progress.keyword_syntheses}</span>
                    <span className="text-sm text-muted-foreground">/ {progress.total_keywords}</span>
                </div>
                <Progress value={synthPercent} className="h-2" />
            </StatCard>

            <StatCard icon={File} label="Research Report">
                <div className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                    progress.project_syntheses > 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-muted text-muted-foreground',
                )}>
                    {progress.project_syntheses > 0 ? 'Generated' : 'Not yet'}
                </div>
            </StatCard>

            <StatCard icon={Tags} label="Tags">
                <div className="text-2xl font-bold">{progress.total_tags}</div>
            </StatCard>

            <StatCard icon={DollarSign} label="Documents">
                <div className="text-2xl font-bold">{progress.total_documents}</div>
                {progress.total_documents > 0 && (
                    <span className="text-xs text-muted-foreground">
                        v{progress.total_documents}
                    </span>
                )}
            </StatCard>
        </div>
    );
}
