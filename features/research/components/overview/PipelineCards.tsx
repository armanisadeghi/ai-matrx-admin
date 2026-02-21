'use client';

import Link from 'next/link';
import { Search, Globe, FileText, Brain, Layers, Tags, File, DollarSign, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { SCRAPE_STATUS_CONFIG } from '../../constants';
import type { ResearchProgress, ScrapeStatus } from '../../types';

const EMPTY_PROGRESS: ResearchProgress = {
    total_keywords: 0,
    stale_keywords: 0,
    total_sources: 0,
    included_sources: 0,
    sources_by_status: {} as Record<ScrapeStatus, number>,
    total_content: 0,
    total_analyses: 0,
    total_eligible_for_analysis: 0,
    failed_analyses: 0,
    keyword_syntheses: 0,
    failed_keyword_syntheses: 0,
    project_syntheses: 0,
    failed_project_syntheses: 0,
    total_tags: 0,
    total_documents: 0,
};

interface PipelineCardsProps {
    topicId: string;
    progress: ResearchProgress | null;
}

interface StatCardProps {
    icon: typeof Search;
    label: string;
    href: string;
    children: React.ReactNode;
    highlight?: boolean;
}

function StatCard({ icon: Icon, label, href, children, highlight }: StatCardProps) {
    return (
        <Link
            href={href}
            className={cn(
                'group relative rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3 space-y-1.5 transition-all block',
                'hover:border-primary/30 hover:bg-card/80',
                highlight && 'ring-1 ring-primary/15',
            )}
        >
            <div className="flex items-center justify-between text-muted-foreground/70">
                <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
                </div>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
            {children}
        </Link>
    );
}

export function PipelineCards({ topicId, progress: progressProp }: PipelineCardsProps) {
    const progress = progressProp ?? EMPTY_PROGRESS;
    const base = `/p/research/topics/${topicId}`;

    const analysisPercent = progress.total_eligible_for_analysis > 0
        ? Math.round((progress.total_analyses / progress.total_eligible_for_analysis) * 100)
        : 0;

    const synthPercent = progress.total_keywords > 0
        ? Math.round((progress.keyword_syntheses / progress.total_keywords) * 100)
        : 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard icon={Search} label="Keywords" href={`${base}/keywords`}>
                <div className="text-lg font-bold leading-none">{progress.total_keywords}</div>
                {progress.stale_keywords > 0 ? (
                    <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">
                        {progress.stale_keywords} stale
                    </span>
                ) : (
                    <span className="text-[10px] text-muted-foreground">search keywords</span>
                )}
            </StatCard>

            <StatCard icon={Globe} label="Sources" href={`${base}/sources`}>
                <div className="text-lg font-bold leading-none">{progress.total_sources}</div>
                <div className="text-[10px] text-muted-foreground">{progress.included_sources} included</div>
                {progress.sources_by_status && progress.total_sources > 0 && (
                    <div className="flex h-1 w-full overflow-hidden rounded-full bg-muted/50 mt-0.5">
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

            <StatCard icon={FileText} label="Content" href={`${base}/sources?scrape_status=success`}>
                <div className="text-lg font-bold leading-none">{progress.total_content}</div>
                <div className="text-[10px] text-muted-foreground">
                    {progress.total_sources > 0
                        ? `${Math.round((progress.total_content / progress.total_sources) * 100)}% scraped`
                        : 'pages scraped'}
                </div>
            </StatCard>

            <StatCard
                icon={Brain}
                label="Analyses"
                href={`${base}/sources?scrape_status=success`}
                highlight={progress.total_eligible_for_analysis > 0 && progress.total_analyses < progress.total_eligible_for_analysis}
            >
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold leading-none">{progress.total_analyses}</span>
                    <span className="text-[10px] text-muted-foreground">/ {progress.total_eligible_for_analysis}</span>
                </div>
                <Progress value={analysisPercent} className="h-1" />
                {(progress.failed_analyses ?? 0) > 0 && (
                    <div className="flex items-center gap-0.5 text-[10px] text-destructive/80 font-medium">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {progress.failed_analyses} failed
                    </div>
                )}
            </StatCard>

            <StatCard icon={Layers} label="Kw Syntheses" href={`${base}/keywords`}>
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold leading-none">{progress.keyword_syntheses}</span>
                    <span className="text-[10px] text-muted-foreground">/ {progress.total_keywords}</span>
                </div>
                <Progress value={synthPercent} className="h-1" />
                {(progress.failed_keyword_syntheses ?? 0) > 0 && (
                    <div className="flex items-center gap-0.5 text-[10px] text-destructive/80 font-medium">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {progress.failed_keyword_syntheses} failed
                    </div>
                )}
            </StatCard>

            <StatCard icon={File} label="Report" href={`${base}/synthesis`}>
                <div className={cn(
                    'inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold',
                    progress.project_syntheses > 0
                        ? 'bg-green-100/60 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-muted/50 text-muted-foreground/70',
                )}>
                    {progress.project_syntheses > 0 ? 'Generated' : 'Not yet'}
                </div>
                {(progress.failed_project_syntheses ?? 0) > 0 && (
                    <div className="flex items-center gap-0.5 text-[10px] text-destructive/80 font-medium">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        failed
                    </div>
                )}
            </StatCard>

            <StatCard icon={Tags} label="Tags" href={`${base}/tags`}>
                <div className="text-lg font-bold leading-none">{progress.total_tags}</div>
                <span className="text-[10px] text-muted-foreground">organize sources</span>
            </StatCard>

            <StatCard icon={DollarSign} label="Documents" href={`${base}/document`}>
                <div className="text-lg font-bold leading-none">{progress.total_documents}</div>
                <span className="text-[10px] text-muted-foreground">
                    {progress.total_documents > 0 ? `${progress.total_documents} version${progress.total_documents !== 1 ? 's' : ''}` : 'none yet'}
                </span>
            </StatCard>
        </div>
    );
}
