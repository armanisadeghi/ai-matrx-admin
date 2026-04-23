"use client";

import React, { useMemo, useState } from "react";
import {
    Check,
    ChevronDown,
    ChevronRight,
    Search,
    Sparkles,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    PRESET_CATEGORIES,
    RECOMMENDED_BUNDLES,
    type PresetCategory,
    type StudioPreset,
} from "../presets";

const ACCENT_CLASSES: Record<PresetCategory["accent"], string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

interface PresetCatalogProps {
    selectedIds: string[];
    onToggle: (id: string) => void;
    onApplyBundle: (ids: string[]) => void;
    onDeselectAll: () => void;
}

export function PresetCatalog({
    selectedIds,
    onToggle,
    onApplyBundle,
    onDeselectAll,
}: PresetCatalogProps) {
    const [query, setQuery] = useState("");
    const [expandedCategory, setExpandedCategory] = useState<string | null>(
        PRESET_CATEGORIES[0]?.id ?? null,
    );

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const filteredCategories = useMemo<PresetCategory[]>(() => {
        const q = query.trim().toLowerCase();
        if (!q) return PRESET_CATEGORIES;
        return PRESET_CATEGORIES.map((cat) => ({
            ...cat,
            presets: cat.presets.filter((p) => matchesQuery(p, q, cat.name)),
        })).filter((cat) => cat.presets.length > 0);
    }, [query]);

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Search + summary */}
            <div className="p-3 border-b border-border bg-card/50 space-y-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search 60+ presets…"
                        className="w-full h-8 rounded-md border border-border bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded hover:bg-accent text-muted-foreground flex items-center justify-center"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                            {selectedIds.length}
                        </span>{" "}
                        selected
                    </span>
                    {selectedIds.length > 0 && (
                        <button
                            type="button"
                            onClick={onDeselectAll}
                            className="text-muted-foreground hover:text-destructive underline"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Recommended bundles */}
            {!query && (
                <div className="p-3 border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                        <Sparkles className="h-3 w-3" /> Recommended bundles
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                        {RECOMMENDED_BUNDLES.map((b) => {
                            const allSelected = b.presetIds.every((id) =>
                                selectedSet.has(id),
                            );
                            return (
                                <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => onApplyBundle(b.presetIds)}
                                    className={cn(
                                        "text-left rounded-lg border px-2.5 py-1.5 transition-colors",
                                        allSelected
                                            ? "border-primary/40 bg-primary/5"
                                            : "border-border hover:border-primary/40 hover:bg-muted/30",
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-xs font-medium truncate">
                                            {b.name}
                                        </span>
                                        {allSelected && (
                                            <Check className="h-3 w-3 text-primary shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                        {b.presetIds.length} presets
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Categories */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {filteredCategories.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No presets match{" "}
                        <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
                    </div>
                ) : (
                    filteredCategories.map((cat) => {
                        const isExpanded = expandedCategory === cat.id || !!query;
                        const CategoryIcon = cat.icon;
                        const selectedInCat = cat.presets.filter((p) =>
                            selectedSet.has(p.id),
                        ).length;
                        return (
                            <div key={cat.id} className="border-b border-border last:border-0">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedCategory((prev) => (prev === cat.id ? null : cat.id))
                                    }
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                                >
                                    <div
                                        className={cn(
                                            "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                                            ACCENT_CLASSES[cat.accent],
                                        )}
                                    >
                                        <CategoryIcon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{cat.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {cat.presets.length} presets
                                            {selectedInCat > 0 &&
                                                ` · ${selectedInCat} selected`}
                                        </p>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="px-2 pb-2 flex flex-col gap-1">
                                        {cat.presets.map((p) => (
                                            <PresetRow
                                                key={p.id}
                                                preset={p}
                                                selected={selectedSet.has(p.id)}
                                                onToggle={() => onToggle(p.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function PresetRow({
    preset,
    selected,
    onToggle,
}: {
    preset: StudioPreset;
    selected: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "group flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                selected
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-muted/40",
            )}
        >
            <div
                className={cn(
                    "mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    selected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-background",
                )}
            >
                {selected && <Check className="h-2.5 w-2.5" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-medium truncate">{preset.name}</p>
                    <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {preset.width}×{preset.height}
                    </span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1 leading-snug">
                    {preset.usage}
                </p>
            </div>
        </button>
    );
}

function matchesQuery(p: StudioPreset, q: string, categoryName: string): boolean {
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.usage.toLowerCase().includes(q)) return true;
    if (p.spec?.toLowerCase().includes(q)) return true;
    if (categoryName.toLowerCase().includes(q)) return true;
    if (p.tags?.some((t) => t.toLowerCase().includes(q))) return true;
    if (`${p.width}x${p.height}`.includes(q) || `${p.width}×${p.height}`.includes(q))
        return true;
    return false;
}

/** Read-only version of the catalog, used on the public /image-studio/presets page. */
export function PresetCatalogReadOnly() {
    return (
        <div className="flex flex-col gap-6">
            {PRESET_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                    <section key={cat.id} className="space-y-3">
                        <header className="flex items-start gap-3">
                            <div
                                className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                    ACCENT_CLASSES[cat.accent],
                                )}
                            >
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">{cat.name}</h2>
                                <p className="text-sm text-muted-foreground max-w-3xl">
                                    {cat.description}
                                </p>
                            </div>
                        </header>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cat.presets.map((p) => (
                                <div
                                    key={p.id}
                                    className="rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
                                >
                                    <div className="flex items-baseline justify-between gap-2">
                                        <h3 className="text-sm font-medium truncate">
                                            {p.name}
                                        </h3>
                                        <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                            {p.width}×{p.height}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
                                        {p.usage}
                                    </p>
                                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                        {p.spec && (
                                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                                                {p.spec}
                                            </span>
                                        )}
                                        {p.defaultFormat && (
                                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase">
                                                {p.defaultFormat}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] capitalize">
                                            {p.aspect}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

/** Small icon legend for navigation. */
export function PresetCategoryLegend() {
    return (
        <div className="flex flex-wrap gap-1.5">
            {PRESET_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                    <span
                        key={cat.id}
                        className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                            ACCENT_CLASSES[cat.accent],
                        )}
                    >
                        <Icon className="h-3 w-3" />
                        {cat.name}
                        <span className="font-mono opacity-70">
                            {cat.presets.length}
                        </span>
                    </span>
                );
            })}
        </div>
    );
}
