'use client';

import Link from 'next/link';
import { Search, Globe, FileText, Brain, Layers, Tags, File, DollarSign, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { SCRAPE_STATUS_CONFIG } from '../../constants';
import type { ResearchProgress, ScrapeStatus } from '../../types';

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
                'group relative rounded-xl border border-border bg-card p-4 space-y-2 transition-colors block',
                'hover:border-primary/40 hover:bg-accent/30',
                highlight && 'ring-1 ring-primary/20',
            )}
        >
            <div className="flex items-center justify-between text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {children}
        </Link>
    );
}

export function PipelineCards({ topicId, progress }: PipelineCardsProps) {
    if (!progress) return null;

    const base = `/p/research/topics/${topicId}`;

    const analysisPercent = progress.total_eligible_for_analysis > 0
        ? Math.round((progress.total_analyses / progress.total_eligible_for_analysis) * 100)
        : 0;

    const synthPercent = progress.total_keywords > 0
        ? Math.round((progress.keyword_syntheses / progress.total_keywords) * 100)
        : 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Keywords → /keywords */}
            <StatCard icon={Search} label="Keywords" href={`${base}/keywords`}>
                <div className="text-2xl font-bold">{progress.total_keywords}</div>
                {progress.stale_keywords > 0 ? (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        {progress.stale_keywords} stale
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">search keywords</span>
                )}
            </StatCard>

            {/* Sources → /sources */}
            <StatCard icon={Globe} label="Sources" href={`${base}/sources`}>
                <div className="text-2xl font-bold">{progress.total_sources}</div>
                <div className="text-xs text-muted-foreground">{progress.included_sources} included</div>
                {progress.sources_by_status && progress.total_sources > 0 && (
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted mt-1">
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

            {/* Content → /sources?scrape_status=success  (scraped pages live inside sources) */}
            <StatCard icon={FileText} label="Scraped Content" href={`${base}/sources?scrape_status=success`}>
                <div className="text-2xl font-bold">{progress.total_content}</div>
                <div className="text-xs text-muted-foreground">
                    {progress.total_sources > 0
                        ? `${Math.round((progress.total_content / progress.total_sources) * 100)}% of sources`
                        : 'pages scraped'}
                </div>
            </StatCard>

            {/* Analyses → /sources?scrape_status=success (analyses are per-source, viewed inside source detail) */}
            <StatCard
                icon={Brain}
                label="Analyses"
                href={`${base}/sources?scrape_status=success`}
                highlight={progress.total_eligible_for_analysis > 0 && progress.total_analyses < progress.total_eligible_for_analysis}
            >
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{progress.total_analyses}</span>
                    <span className="text-sm text-muted-foreground">/ {progress.total_eligible_for_analysis}</span>
                </div>
                <Progress value={analysisPercent} className="h-1.5" />
                {(progress.failed_analyses ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {progress.failed_analyses} failed
                    </div>
                )}
            </StatCard>

            {/* Keyword Syntheses → /keywords */}
            <StatCard icon={Layers} label="Keyword Syntheses" href={`${base}/keywords`}>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{progress.keyword_syntheses}</span>
                    <span className="text-sm text-muted-foreground">/ {progress.total_keywords}</span>
                </div>
                <Progress value={synthPercent} className="h-1.5" />
                {(progress.failed_keyword_syntheses ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {progress.failed_keyword_syntheses} failed
                    </div>
                )}
            </StatCard>

            {/* Research Report → /documents */}
            <StatCard icon={File} label="Research Report" href={`${base}/documents`}>
                <div className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                    progress.project_syntheses > 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-muted text-muted-foreground',
                )}>
                    {progress.project_syntheses > 0 ? 'Generated' : 'Not yet'}
                </div>
                {(progress.failed_project_syntheses ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {progress.failed_project_syntheses} synthesis failed
                    </div>
                )}
                {progress.project_syntheses > 0 && !progress.failed_project_syntheses && (
                    <div className="text-xs text-muted-foreground">click to view</div>
                )}
            </StatCard>

            {/* Tags → /tags */}
            <StatCard icon={Tags} label="Tags" href={`${base}/tags`}>
                <div className="text-2xl font-bold">{progress.total_tags}</div>
                <div className="text-xs text-muted-foreground">organize sources</div>
            </StatCard>

            {/* Documents → /documents */}
            <StatCard icon={DollarSign} label="Documents" href={`${base}/documents`}>
                <div className="text-2xl font-bold">{progress.total_documents}</div>
                <div className="text-xs text-muted-foreground">
                    {progress.total_documents > 0 ? `${progress.total_documents} version${progress.total_documents !== 1 ? 's' : ''}` : 'none yet'}
                </div>
            </StatCard>
        </div>
    );
}
