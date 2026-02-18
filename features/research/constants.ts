import type { AutonomyLevel, ScrapeStatus, SourceType, SourceOrigin, ResearchStreamStep } from './types';

// ============================================================================
// STATUS COLORS
// ============================================================================

export const SCRAPE_STATUS_CONFIG: Record<ScrapeStatus, { label: string; color: string; bgClass: string; textClass: string }> = {
    pending: { label: 'Pending', color: '#a1a1aa', bgClass: 'bg-zinc-200 dark:bg-zinc-700', textClass: 'text-zinc-700 dark:text-zinc-300' },
    success: { label: 'Success', color: '#22c55e', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-700 dark:text-green-400' },
    thin: { label: 'Thin', color: '#eab308', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', textClass: 'text-yellow-700 dark:text-yellow-400' },
    failed: { label: 'Failed', color: '#ef4444', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-400' },
    complete: { label: 'Complete', color: '#3b82f6', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-400' },
    manual: { label: 'Manual', color: '#a855f7', bgClass: 'bg-purple-100 dark:bg-purple-900/30', textClass: 'text-purple-700 dark:text-purple-400' },
    skipped: { label: 'Skipped', color: '#6b7280', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-600 dark:text-gray-400' },
};

export const SOURCE_TYPE_CONFIG: Record<SourceType, { label: string; icon: string }> = {
    web: { label: 'Web', icon: 'Globe' },
    youtube: { label: 'YouTube', icon: 'Play' },
    pdf: { label: 'PDF', icon: 'FileText' },
    file: { label: 'File', icon: 'File' },
    manual: { label: 'Manual', icon: 'Pencil' },
};

export const ORIGIN_CONFIG: Record<SourceOrigin, { label: string; color: string }> = {
    search: { label: 'Search', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    manual: { label: 'Manual', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    link_extraction: { label: 'Link', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    file_upload: { label: 'Upload', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

export const AUTONOMY_CONFIG: Record<AutonomyLevel, { label: string; description: string; icon: string }> = {
    auto: {
        label: 'Automatic',
        description: 'Full pipeline runs immediately — search, scrape, analyze, and generate a report. Review when ready.',
        icon: 'Zap',
    },
    semi: {
        label: 'Semi-Auto',
        description: 'Search and scrape automatically, then pause for your review before analysis and report generation.',
        icon: 'SlidersHorizontal',
    },
    manual: {
        label: 'Manual',
        description: 'Full control at every step. Nothing runs until you trigger it.',
        icon: 'Hand',
    },
};

export const PIPELINE_STEPS: { key: ResearchStreamStep; label: string; icon: string }[] = [
    { key: 'searching', label: 'Searching', icon: 'Search' },
    { key: 'scraping', label: 'Scraping', icon: 'Download' },
    { key: 'analyzing', label: 'Analyzing', icon: 'Brain' },
    { key: 'synthesizing', label: 'Synthesizing', icon: 'Layers' },
    { key: 'reporting', label: 'Report', icon: 'FileText' },
];

// ============================================================================
// NAV ITEMS
// ============================================================================

export interface ResearchNavItem {
    key: string;
    label: string;
    icon: string;
    href: (projectId: string) => string;
    mobileVisible: boolean;
}

export const RESEARCH_NAV_ITEMS: ResearchNavItem[] = [
    { key: 'overview', label: 'Overview', icon: 'LayoutDashboard', href: (id) => `/p/research/${id}`, mobileVisible: true },
    { key: 'sources', label: 'Sources', icon: 'Globe', href: (id) => `/p/research/${id}/sources`, mobileVisible: true },
    { key: 'document', label: 'Document', icon: 'FileText', href: (id) => `/p/research/${id}/document`, mobileVisible: true },
    { key: 'tags', label: 'Tags', icon: 'Tags', href: (id) => `/p/research/${id}/tags`, mobileVisible: true },
    { key: 'links', label: 'Links', icon: 'Link2', href: (id) => `/p/research/${id}/links`, mobileVisible: false },
    { key: 'media', label: 'Media', icon: 'Image', href: (id) => `/p/research/${id}/media`, mobileVisible: false },
    { key: 'costs', label: 'Costs', icon: 'DollarSign', href: (id) => `/p/research/${id}/costs`, mobileVisible: false },
];

// ============================================================================
// ITERATION MODE DESCRIPTIONS
// ============================================================================

export const ITERATION_MODE_INFO = {
    rebuild: {
        label: 'Rebuild',
        description: 'Fresh synthesis using current included sources. Reuses existing per-page analyses. Best when you\'ve made significant changes to which sources are included.',
        icon: 'RefreshCw',
    },
    update: {
        label: 'Update',
        description: 'Agent updates the existing report with new and changed information. Best for adding a few new sources or keywords without starting over.',
        icon: 'Pencil',
    },
} as const;
