'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, CheckCircle2, AlertCircle, Circle,
    ExternalLink, Plus, ChevronDown, ChevronRight, X,
    Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import ModelDetailSheet, { OpenDetailButton } from '../audit/ModelDetailSheet';
import type { AiModelRow, AiProvider, ProviderModelEntry } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────

type ProviderSummary = {
    id: string;
    name: string | null;
    has_cache: boolean;
    fetched_at: string | null;
    model_count: number;
    is_supported: boolean;
    provider_key: string | null;
};

type ComparisonStatus = 'matched' | 'missing_local' | 'extra_local';

type ModelComparison = {
    id: string;
    display_name: string;
    provider_id: string;
    status: ComparisonStatus;
    providerEntry?: ProviderModelEntry;
    localEntry?: AiModelRow;
};

type Props = {
    localModels: AiModelRow[];
    providers: AiProvider[];
    onModelsChanged?: () => void;
};

// ─── Status colour helpers ─────────────────────────────────────────────────

const STATUS_ROW_CLASS: Record<ComparisonStatus, string> = {
    matched:       'bg-green-50/60 dark:bg-green-900/10 border-l-2 border-l-green-400',
    missing_local: 'bg-amber-50/70 dark:bg-amber-900/15 border-l-2 border-l-amber-400',
    extra_local:   'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-400',
};

const STATUS_SELECTED_CLASS: Record<ComparisonStatus, string> = {
    matched:       'ring-1 ring-green-400 bg-green-100/80 dark:bg-green-900/25',
    missing_local: 'ring-1 ring-amber-400 bg-amber-100/80 dark:bg-amber-900/25',
    extra_local:   'ring-1 ring-blue-400 bg-blue-100/80 dark:bg-blue-900/25',
};

function StatusBadge({ status }: { status: ComparisonStatus }) {
    if (status === 'matched') {
        return (
            <Badge variant="outline" className="text-[10px] h-5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 whitespace-nowrap gap-1">
                <CheckCircle2 className="h-3 w-3" />Matched
            </Badge>
        );
    }
    if (status === 'missing_local') {
        return (
            <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 whitespace-nowrap">
                Not in our DB
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 whitespace-nowrap">
            Extra / deprecated
        </Badge>
    );
}

// ─── Capability tree renderer ──────────────────────────────────────────────

function CapNode({ label, value, depth = 0 }: { label: string; value: unknown; depth?: number }) {
    const [open, setOpen] = useState(depth < 2);
    if (value === null || value === undefined) return null;

    if (typeof value === 'object' && !Array.isArray(value)) {
        const entries = Object.entries(value as Record<string, unknown>);
        const isSingleSupported = entries.length === 1 && entries[0][0] === 'supported';
        if (isSingleSupported) {
            const supported = entries[0][1] as boolean;
            return (
                <div className="flex items-center gap-2 py-0.5">
                    <span className="text-xs text-muted-foreground w-40 shrink-0 truncate" title={label}>{label}</span>
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 ${supported ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300' : 'bg-muted text-muted-foreground'}`}>
                        {supported ? 'supported' : 'no'}
                    </Badge>
                </div>
            );
        }
        return (
            <div className="py-0.5">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-1 text-xs hover:text-foreground text-foreground/80 font-medium"
                >
                    {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {label}
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">({entries.length} fields)</span>
                </button>
                {open && (
                    <div className="ml-4 pl-2 border-l border-border mt-0.5 space-y-0">
                        {entries.map(([k, v]) => (
                            <CapNode key={k} label={k} value={v} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 py-0.5">
            <span className="text-xs text-muted-foreground w-40 shrink-0 truncate" title={label}>{label}</span>
            <span className="text-xs font-mono">{String(value)}</span>
        </div>
    );
}

// ─── Provider entry detail panel ──────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Copy JSON"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

function ProviderEntryDetail({
    comparison,
    onClose,
    onOpenModel,
}: {
    comparison: ModelComparison;
    onClose: () => void;
    onOpenModel: (id: string) => void;
}) {
    const pe = comparison.providerEntry;
    const le = comparison.localEntry;

    const formatNum = (n?: number | null) => n == null ? '—' : n.toLocaleString();
    const formatDate = (d?: string) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return d; }
    };

    const jsonStr = pe ? JSON.stringify(pe, null, 2) : null;

    return (
        <div className="flex flex-col h-full border-l bg-card overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{comparison.display_name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{comparison.id}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <StatusBadge status={comparison.status} />
                    {comparison.status === 'matched' && le && (
                        <OpenDetailButton onClick={() => onOpenModel(le.id)} />
                    )}
                    <button
                        onClick={onClose}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <Tabs defaultValue="structured" className="flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="shrink-0 border-b px-4">
                    <TabsList className="h-8 bg-transparent p-0 gap-0">
                        {['structured', 'json', 'our_db'].map((t) => (
                            <TabsTrigger
                                key={t}
                                value={t}
                                className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
                            >
                                {t === 'structured' ? 'Provider Data' : t === 'json' ? 'Raw JSON' : 'Our DB Record'}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {/* ── Structured view ── */}
                <TabsContent value="structured" className="flex-1 m-0 overflow-auto min-h-0">
                    {pe ? (
                        <div className="p-4 space-y-4">
                            {/* Core fields */}
                            <section>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Core Fields</p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Display Name</p>
                                        <p className="text-xs font-medium">{pe.display_name ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Type</p>
                                        <p className="text-xs font-mono">{String(pe.type ?? '—')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Context Window (input)</p>
                                        <p className="text-xs font-mono">{formatNum(pe.max_input_tokens)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Max Output Tokens</p>
                                        <p className="text-xs font-mono">{formatNum(pe.max_tokens)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Released</p>
                                        <p className="text-xs">{formatDate(pe.created_at)}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Capabilities */}
                            {pe.capabilities && typeof pe.capabilities === 'object' && (
                                <section>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Capabilities</p>
                                    <div className="border rounded-md p-3 bg-muted/20">
                                        {Object.entries(pe.capabilities as Record<string, unknown>).map(([k, v]) => (
                                            <CapNode key={k} label={k} value={v} depth={0} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Any remaining provider-specific fields */}
                            {(() => {
                                const knownKeys = new Set(['id', 'display_name', 'created_at', 'type', 'max_input_tokens', 'max_tokens', 'capabilities']);
                                const extra = Object.entries(pe).filter(([k]) => !knownKeys.has(k));
                                if (extra.length === 0) return null;
                                return (
                                    <section>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Additional Fields</p>
                                        <div className="space-y-1.5">
                                            {extra.map(([k, v]) => (
                                                <div key={k} className="flex items-start gap-3">
                                                    <span className="text-xs text-muted-foreground w-36 shrink-0">{k}</span>
                                                    <span className="text-xs font-mono break-all">
                                                        {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            No provider data — this model is only in our DB
                        </div>
                    )}
                </TabsContent>

                {/* ── Raw JSON view ── */}
                <TabsContent value="json" className="flex-1 m-0 overflow-auto min-h-0">
                    {jsonStr ? (
                        <div className="relative h-full">
                            <div className="absolute top-2 right-3 z-10">
                                <CopyButton text={jsonStr} />
                            </div>
                            <pre className="p-4 pt-8 text-[11px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
                                {jsonStr}
                            </pre>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            No raw provider data available
                        </div>
                    )}
                </TabsContent>

                {/* ── Our DB record ── */}
                <TabsContent value="our_db" className="flex-1 m-0 overflow-auto min-h-0">
                    {le ? (
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                {([
                                    ['name', le.name],
                                    ['common_name', le.common_name ?? '—'],
                                    ['model_class', le.model_class],
                                    ['api_class', le.api_class ?? '—'],
                                    ['provider', le.provider ?? '—'],
                                    ['context_window', le.context_window?.toLocaleString() ?? '—'],
                                    ['max_tokens', le.max_tokens?.toLocaleString() ?? '—'],
                                    ['is_primary', String(le.is_primary ?? false)],
                                    ['is_deprecated', String(le.is_deprecated ?? false)],
                                    ['is_premium', String(le.is_premium ?? false)],
                                ] as [string, string][]).map(([label, val]) => (
                                    <div key={label}>
                                        <p className="text-[10px] text-muted-foreground">{label}</p>
                                        <p className="text-xs font-mono">{val}</p>
                                    </div>
                                ))}
                            </div>
                            {le.capabilities && (
                                <section>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">capabilities (our format)</p>
                                    <div className="relative">
                                        <div className="absolute top-2 right-2 z-10">
                                            <CopyButton text={JSON.stringify(le.capabilities, null, 2)} />
                                        </div>
                                        <pre className="p-3 pt-7 text-[11px] font-mono bg-muted/30 rounded-md whitespace-pre-wrap break-all leading-relaxed border">
                                            {JSON.stringify(le.capabilities, null, 2)}
                                        </pre>
                                    </div>
                                </section>
                            )}
                            {le.controls && (
                                <section>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">controls (our format)</p>
                                    <div className="relative">
                                        <div className="absolute top-2 right-2 z-10">
                                            <CopyButton text={JSON.stringify(le.controls, null, 2)} />
                                        </div>
                                        <pre className="p-3 pt-7 text-[11px] font-mono bg-muted/30 rounded-md whitespace-pre-wrap break-all leading-relaxed border">
                                            {JSON.stringify(le.controls, null, 2)}
                                        </pre>
                                    </div>
                                </section>
                            )}
                            <div className="pt-2">
                                <OpenDetailButton onClick={() => onOpenModel(le.id)} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            This model is not in our DB yet
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Comparison table rows ─────────────────────────────────────────────────

function ComparisonTable({
    comparisons,
    selectedId,
    onSelect,
    onOpenModel,
}: {
    comparisons: ModelComparison[];
    selectedId: string | null;
    onSelect: (c: ModelComparison | null) => void;
    onOpenModel: (id: string) => void;
}) {
    if (comparisons.length === 0) {
        return (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground border-t">
                No comparison data — sync this provider first.
            </div>
        );
    }

    const formatNum = (n?: number | null) =>
        n == null ? '—' : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

    return (
        <div className="border-t overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] border-b bg-muted/50">
                {['Display Name', 'Model ID', 'Context', 'Max Out', 'Status', ''].map((h, i) => (
                    <div key={i} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                    </div>
                ))}
            </div>

            {comparisons.map((c) => {
                const isSelected = c.id === selectedId;
                const localModelId = c.localEntry?.id;
                const ctx = c.providerEntry?.max_input_tokens ?? c.localEntry?.context_window;
                const maxOut = c.providerEntry?.max_tokens ?? c.localEntry?.max_tokens;

                return (
                    <div
                        key={c.id}
                        onClick={() => onSelect(isSelected ? null : c)}
                        className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] border-b last:border-b-0 items-center cursor-pointer transition-all ${
                            isSelected ? STATUS_SELECTED_CLASS[c.status] : STATUS_ROW_CLASS[c.status] + ' hover:brightness-95 dark:hover:brightness-110'
                        }`}
                    >
                        <div className="px-3 py-2 min-w-0">
                            <span className="text-xs font-medium truncate block">{c.display_name}</span>
                        </div>
                        <div className="px-3 py-2 min-w-0">
                            <span className="text-[11px] font-mono text-muted-foreground truncate block">{c.id}</span>
                        </div>
                        <div className="px-3 py-2">
                            <span className="text-xs tabular-nums">{formatNum(ctx)}</span>
                        </div>
                        <div className="px-3 py-2">
                            <span className="text-xs tabular-nums">{formatNum(maxOut)}</span>
                        </div>
                        <div className="px-3 py-2">
                            <StatusBadge status={c.status} />
                        </div>
                        <div className="px-3 py-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {c.status === 'matched' && localModelId && (
                                <OpenDetailButton onClick={() => onOpenModel(localModelId)} />
                            )}
                            {c.status === 'missing_local' && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] gap-1 text-amber-600"
                                    disabled
                                    title="Coming soon"
                                >
                                    <Plus className="h-3 w-3" />Add
                                </Button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Provider section (collapsible) ───────────────────────────────────────

function ProviderSection({
    summary,
    provider,
    localModels,
    onSync,
    syncing,
    onOpenModel,
    onModelsChanged,
}: {
    summary: ProviderSummary;
    provider: AiProvider | undefined;
    localModels: AiModelRow[];
    onSync: (s: ProviderSummary) => void;
    syncing: boolean;
    onOpenModel: (id: string) => void;
    onModelsChanged?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [selectedComparison, setSelectedComparison] = useState<ModelComparison | null>(null);

    const comparisons: ModelComparison[] = React.useMemo(() => {
        const cache = provider?.provider_models_cache;
        if (!cache) return [];

        const providerIds = new Set(cache.models.map((m) => m.id));
        const localForProvider = localModels.filter(
            (m) =>
                m.model_provider === summary.id ||
                (summary.name && m.provider?.toLowerCase() === summary.name.toLowerCase()),
        );

        const result: ModelComparison[] = [];
        for (const pm of cache.models) {
            const local = localForProvider.find((lm) => lm.name === pm.id);
            result.push({
                id: pm.id,
                display_name: pm.display_name ?? pm.id,
                provider_id: summary.id,
                status: local ? 'matched' : 'missing_local',
                providerEntry: pm,
                localEntry: local,
            });
        }
        for (const lm of localForProvider) {
            if (!providerIds.has(lm.name)) {
                result.push({
                    id: lm.id,
                    display_name: lm.common_name ?? lm.name,
                    provider_id: summary.id,
                    status: 'extra_local',
                    localEntry: lm,
                });
            }
        }
        return result;
    }, [provider, localModels, summary]);

    const matched = comparisons.filter((c) => c.status === 'matched').length;
    const missing = comparisons.filter((c) => c.status === 'missing_local').length;
    const extra   = comparisons.filter((c) => c.status === 'extra_local').length;

    // When collapsing, clear selected
    const handleExpand = () => {
        if (expanded) setSelectedComparison(null);
        setExpanded((v) => !v);
    };

    const canExpand = summary.has_cache;

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-card">
                <button
                    onClick={() => canExpand && handleExpand()}
                    className={`shrink-0 text-muted-foreground ${canExpand ? 'hover:text-foreground cursor-pointer' : 'cursor-default opacity-30'}`}
                    disabled={!canExpand}
                >
                    {canExpand
                        ? (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)
                        : <Circle className="h-4 w-4" />}
                </button>

                <div className="w-36 shrink-0">
                    <span className="font-semibold text-sm">{summary.name ?? summary.id}</span>
                    <div className="mt-0.5">
                        {summary.is_supported
                            ? <Badge variant="outline" className="text-[9px] h-4 px-1">API sync</Badge>
                            : <Badge variant="secondary" className="text-[9px] h-4 px-1">Manual</Badge>}
                    </div>
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 min-w-0">
                    {summary.has_cache ? (
                        <>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Synced {summary.fetched_at ? new Date(summary.fetched_at).toLocaleString() : '—'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 whitespace-nowrap">
                                <CheckCircle2 className="h-3 w-3" />{matched} matched
                            </span>
                            {missing > 0 && (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                    {missing} not in DB
                                </span>
                            )}
                            {extra > 0 && (
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                    {extra} extra/deprecated
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground">No cache — sync to compare</span>
                    )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                    {provider?.models_link && (
                        <a href={provider.models_link} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground" title="Official models page">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                    {summary.is_supported && (
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1.5"
                            onClick={() => onSync(summary)} disabled={syncing}>
                            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing…' : 'Sync Now'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Comparison area: table + optional detail panel side-by-side */}
            {expanded && (
                <div className={`border-t flex ${selectedComparison ? 'divide-x' : ''}`}>
                    {/* Table */}
                    <div className={selectedComparison ? 'w-1/2 overflow-auto' : 'w-full overflow-auto'}>
                        <ComparisonTable
                            comparisons={comparisons}
                            selectedId={selectedComparison?.id ?? null}
                            onSelect={setSelectedComparison}
                            onOpenModel={onOpenModel}
                        />
                    </div>

                    {/* Detail panel */}
                    {selectedComparison && (
                        <div className="w-1/2 max-h-[480px] overflow-hidden flex flex-col">
                            <ProviderEntryDetail
                                comparison={selectedComparison}
                                onClose={() => setSelectedComparison(null)}
                                onOpenModel={onOpenModel}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Dashboard root ────────────────────────────────────────────────────────

export default function ProviderSyncDashboard({ localModels, providers, onModelsChanged }: Props) {
    const [summaries, setSummaries]       = useState<ProviderSummary[]>([]);
    const [syncingId, setSyncingId]       = useState<string | null>(null);
    const [syncError, setSyncError]       = useState<string | null>(null);
    const [syncSuccess, setSyncSuccess]   = useState<string | null>(null);
    const [loading, setLoading]           = useState(true);
    const [sheetModelId, setSheetModelId] = useState<string | null>(null);

    const loadSummaries = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai-models/provider-sync');
            if (!res.ok) throw new Error(await res.text());
            const json = (await res.json()) as { providers: ProviderSummary[] };
            setSummaries(json.providers);
        } catch (err) {
            console.error('[ProviderSyncDashboard] load error', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSummaries(); }, [loadSummaries]);

    const handleSync = async (summary: ProviderSummary) => {
        if (!summary.provider_key) return;
        setSyncingId(summary.id);
        setSyncError(null);
        setSyncSuccess(null);
        try {
            const res = await fetch('/api/ai-models/provider-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider_id: summary.id, provider_key: summary.provider_key }),
            });
            const json = (await res.json()) as { success?: boolean; error?: string; model_count?: number };
            if (!res.ok || json.error) {
                setSyncError(json.error ?? `Sync failed (${res.status})`);
            } else {
                setSyncSuccess(`Synced ${json.model_count ?? 0} models from ${summary.name}`);
                await loadSummaries();
                onModelsChanged?.();
            }
        } catch (err) {
            setSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setSyncingId(null);
        }
    };

    const providerMap = new Map(providers.map((p) => [p.id, p]));
    const totalProviderModels = summaries.reduce((acc, s) => acc + s.model_count, 0);
    const syncedCount    = summaries.filter((s) => s.has_cache).length;
    const supportedCount = summaries.filter((s) => s.is_supported).length;

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Page header */}
            <div className="shrink-0 px-6 py-3 border-b bg-card">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-semibold">Provider Model Sync</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Click any row to inspect its full provider data and compare with your DB record
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={loadSummaries} disabled={loading}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {!loading && (
                    <div className="flex items-center gap-6 mt-2.5 pt-2.5 border-t">
                        {[
                            { value: summaries.length,      label: 'Providers' },
                            { value: supportedCount,         label: 'API sync' },
                            { value: syncedCount,            label: 'Synced' },
                            { value: totalProviderModels,    label: 'Provider models cached' },
                            { value: localModels.length,     label: 'In our DB' },
                        ].map(({ value, label }) => (
                            <div key={label} className="text-center">
                                <p className="text-lg font-bold leading-none">{value}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                            </div>
                        ))}

                        <div className="ml-auto flex items-center gap-3 text-[11px]">
                            {[
                                { color: 'bg-green-300 dark:bg-green-700', label: 'Matched' },
                                { color: 'bg-amber-300 dark:bg-amber-700', label: 'Not in DB' },
                                { color: 'bg-blue-300 dark:bg-blue-700',   label: 'Extra/deprecated' },
                            ].map(({ color, label }) => (
                                <span key={label} className="inline-flex items-center gap-1.5">
                                    <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Notifications */}
            {(syncError || syncSuccess) && (
                <div className={`shrink-0 flex items-center gap-2 px-6 py-2 text-sm border-b ${
                    syncError
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                }`}>
                    {syncError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    <span className="flex-1">{syncError ?? syncSuccess}</span>
                    <button onClick={() => { setSyncError(null); setSyncSuccess(null); }} className="text-xs underline">
                        Dismiss
                    </button>
                </div>
            )}

            {/* Provider list — this is the only scroll container */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-2.5">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-lg" />
                        ))
                    ) : summaries.length === 0 ? (
                        <div className="text-center py-16 text-sm text-muted-foreground">No providers found.</div>
                    ) : (
                        summaries.map((summary) => (
                            <ProviderSection
                                key={summary.id}
                                summary={summary}
                                provider={providerMap.get(summary.id)}
                                localModels={localModels}
                                onSync={handleSync}
                                syncing={syncingId === summary.id}
                                onOpenModel={setSheetModelId}
                                onModelsChanged={onModelsChanged}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Model detail sheet */}
            <ModelDetailSheet
                modelId={sheetModelId}
                allModels={localModels}
                onClose={() => setSheetModelId(null)}
                onSaved={() => { onModelsChanged?.(); setSheetModelId(null); }}
            />
        </div>
    );
}
