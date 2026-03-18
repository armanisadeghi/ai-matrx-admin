"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    Wand2,
    FlaskConical,
    Bug,
    Settings,
    Loader2,
    X,
    Tag,
    TestTube2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useTools } from "@/hooks/useTools";
import { supabase } from "@/utils/supabase/client";
import { mapIcon } from "@/utils/icons/icon-mapper";
import { formatText } from "@/utils/text/text-case-converter";

interface Tool {
    id: string;
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    output_schema?: Record<string, unknown>;
    annotations?: unknown[];
    function_path: string;
    category?: string;
    tags?: string[];
    icon?: string;
    is_active?: boolean;
    version?: string;
    created_at?: string;
    updated_at?: string;
}

/** tool_name → sample count, ui component count */
interface ToolCounts {
    sampleCount: number;
    uiComponentCount: number;
}

/** Extracts the top-level module/app name from a dotted function_path (e.g. "myapp.module.fn" → "myapp") */
function sourceAppFromPath(functionPath: string): string {
    if (!functionPath) return "unknown";
    return functionPath.split(".")[0] || "unknown";
}

function hasOutputSchema(tool: Tool): boolean {
    if (!tool.output_schema) return false;
    return Object.keys(tool.output_schema).length > 0;
}

function hasAnnotations(tool: Tool): boolean {
    return Array.isArray(tool.annotations) && tool.annotations.length > 0;
}

type TestFilter =
    | "all"
    | "fully_ready"
    | "has_samples"
    | "no_samples"
    | "has_ui"
    | "no_ui"
    | "has_output_schema"
    | "no_output_schema"
    | "has_annotations"
    | "no_annotations";

export function McpToolsManager() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { databaseTools, isLoading, error, refetch } = useTools({ autoFetch: true });
    const { toast } = useToast();

    const [tools, setTools] = useState<Tool[]>([]);
    const [toolCounts, setToolCounts] = useState<Record<string, ToolCounts>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedSourceApp, setSelectedSourceApp] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");
    const [selectedTag, setSelectedTag] = useState<string>("all");
    const [selectedTestFilter, setSelectedTestFilter] = useState<TestFilter>("all");
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        toolId: string | null;
        toolName: string | null;
    }>({ isOpen: false, toolId: null, toolName: null });

    useEffect(() => {
        setTools(databaseTools.map(tool => ({ ...tool })));
    }, [databaseTools]);

    // Fetch sample + UI component counts for all tools in one go
    useEffect(() => {
        if (databaseTools.length === 0) return;
        const toolNames = databaseTools.map(t => t.name);

        async function fetchCounts() {
            const [samplesRes, uiRes] = await Promise.all([
                supabase
                    .from("tool_test_samples")
                    .select("tool_name")
                    .in("tool_name", toolNames),
                supabase
                    .from("tool_ui_components")
                    .select("tool_name")
                    .in("tool_name", toolNames),
            ]);

            const counts: Record<string, ToolCounts> = {};
            for (const name of toolNames) {
                counts[name] = { sampleCount: 0, uiComponentCount: 0 };
            }
            for (const row of samplesRes.data ?? []) {
                if (counts[row.tool_name]) counts[row.tool_name].sampleCount++;
            }
            for (const row of uiRes.data ?? []) {
                if (counts[row.tool_name]) counts[row.tool_name].uiComponentCount++;
            }
            setToolCounts(counts);
        }

        fetchCounts().catch(console.error);
    }, [databaseTools]);

    const categories = React.useMemo(() => {
        const cats = new Set(tools.map(tool => tool.category).filter(Boolean));
        return ["all", ...Array.from(cats as Set<string>).sort()];
    }, [tools]);

    const sourceApps = React.useMemo(() => {
        const apps = new Set(tools.map(tool => sourceAppFromPath(tool.function_path)));
        return ["all", ...Array.from(apps).sort()];
    }, [tools]);

    const allTags = React.useMemo(() => {
        const tagSet = new Set<string>();
        tools.forEach(tool => tool.tags?.forEach(t => tagSet.add(t)));
        return ["all", ...Array.from(tagSet).sort()];
    }, [tools]);

    const activeFilterCount = [
        selectedCategory !== "all",
        selectedSourceApp !== "all",
        selectedStatus !== "all",
        selectedTag !== "all",
        selectedTestFilter !== "all",
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSelectedCategory("all");
        setSelectedSourceApp("all");
        setSelectedStatus("all");
        setSelectedTag("all");
        setSelectedTestFilter("all");
        setSearchQuery("");
    };

    const filteredTools = React.useMemo(() => {
        return tools.filter(tool => {
            const matchesSearch = !searchQuery ||
                tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                tool.function_path.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
            const matchesSourceApp = selectedSourceApp === "all" || sourceAppFromPath(tool.function_path) === selectedSourceApp;
            const matchesStatus =
                selectedStatus === "all" ||
                (selectedStatus === "active" && tool.is_active) ||
                (selectedStatus === "inactive" && !tool.is_active);
            const matchesTag = selectedTag === "all" || tool.tags?.includes(selectedTag);

            const counts = toolCounts[tool.name] ?? { sampleCount: 0, uiComponentCount: 0 };
            const hasSamples = counts.sampleCount > 0;
            const hasUi = counts.uiComponentCount > 0;
            const hasOutput = hasOutputSchema(tool);
            const hasAnn = hasAnnotations(tool);
            const fullyReady = hasSamples && hasUi && hasOutput && hasAnn;

            const matchesTest =
                selectedTestFilter === "all" ||
                (selectedTestFilter === "fully_ready" && fullyReady) ||
                (selectedTestFilter === "has_samples" && hasSamples) ||
                (selectedTestFilter === "no_samples" && !hasSamples) ||
                (selectedTestFilter === "has_ui" && hasUi) ||
                (selectedTestFilter === "no_ui" && !hasUi) ||
                (selectedTestFilter === "has_output_schema" && hasOutput) ||
                (selectedTestFilter === "no_output_schema" && !hasOutput) ||
                (selectedTestFilter === "has_annotations" && hasAnn) ||
                (selectedTestFilter === "no_annotations" && !hasAnn);

            return matchesSearch && matchesCategory && matchesSourceApp && matchesStatus && matchesTag && matchesTest;
        });
    }, [tools, toolCounts, searchQuery, selectedCategory, selectedSourceApp, selectedStatus, selectedTag, selectedTestFilter]);

    const navigateTo = (path: string) => {
        startTransition(() => router.push(path));
    };

    const handleToggleActive = async (toolId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/admin/tools/${toolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: isActive }),
            });
            if (!response.ok) throw new Error("Failed to update");
            setTools(prev => prev.map(t => t.id === toolId ? { ...t, is_active: isActive } : t));
        } catch {
            toast({ title: "Error updating tool", variant: "destructive" });
            setTools(prev => prev.map(t => t.id === toolId ? { ...t, is_active: !isActive } : t));
        }
    };

    const handleDeleteTool = (toolId: string, toolName: string) => {
        setDeleteConfirmation({ isOpen: true, toolId, toolName });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.toolId) return;
        try {
            const response = await fetch(`/api/admin/tools/${deleteConfirmation.toolId}`, { method: "DELETE" });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to delete");
            }
            toast({ title: "Deleted" });
            await refetch();
        } catch (err) {
            toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setDeleteConfirmation({ isOpen: false, toolId: null, toolName: null });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading tools…
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 text-destructive py-8">
                <X className="h-5 w-5" />
                Error loading tools: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-safe">
            {/* Toolbar — row 1: search + actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search name, description, path, tags…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10"
                        style={{ fontSize: "16px" }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                            Clear ({activeFilterCount})
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading} className="h-8 gap-1.5">
                        <Settings className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button size="sm" onClick={() => navigateTo("/administration/mcp-tools/new")} disabled={isPending} className="h-8 gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Add Tool
                    </Button>
                </div>
            </div>

            {/* Toolbar — row 2: filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <Select value={selectedSourceApp} onValueChange={setSelectedSourceApp}>
                    <SelectTrigger className={`h-8 w-40 text-xs ${selectedSourceApp !== "all" ? "border-primary text-primary" : ""}`}>
                        <Filter className="h-3 w-3 mr-1 flex-shrink-0" />
                        <SelectValue placeholder="Source App" />
                    </SelectTrigger>
                    <SelectContent>
                        {sourceApps.map(app => (
                            <SelectItem key={app} value={app} className="text-xs">
                                {app === "all" ? "All Source Apps" : formatText(app)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className={`h-8 w-40 text-xs ${selectedCategory !== "all" ? "border-primary text-primary" : ""}`}>
                        <Filter className="h-3 w-3 mr-1 flex-shrink-0" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat} className="text-xs">
                                {cat === "all" ? "All Categories" : formatText(cat)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={v => setSelectedStatus(v as "all" | "active" | "inactive")}>
                    <SelectTrigger className={`h-8 w-36 text-xs ${selectedStatus !== "all" ? "border-primary text-primary" : ""}`}>
                        <Filter className="h-3 w-3 mr-1 flex-shrink-0" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                        <SelectItem value="active" className="text-xs">Active only</SelectItem>
                        <SelectItem value="inactive" className="text-xs">Inactive only</SelectItem>
                    </SelectContent>
                </Select>

                {allTags.length > 1 && (
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                        <SelectTrigger className={`h-8 w-36 text-xs ${selectedTag !== "all" ? "border-primary text-primary" : ""}`}>
                            <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                            <SelectValue placeholder="Tag" />
                        </SelectTrigger>
                        <SelectContent>
                            {allTags.map(tag => (
                                <SelectItem key={tag} value={tag} className="text-xs">
                                    {tag === "all" ? "All Tags" : tag}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <Select value={selectedTestFilter} onValueChange={v => setSelectedTestFilter(v as TestFilter)}>
                    <SelectTrigger className={`h-8 w-48 text-xs ${selectedTestFilter !== "all" ? "border-primary text-primary" : ""}`}>
                        <TestTube2 className="h-3 w-3 mr-1 flex-shrink-0" />
                        <SelectValue placeholder="Test Readiness" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">All Tools</SelectItem>
                        <SelectItem value="fully_ready" className="text-xs">Fully Ready (all 4)</SelectItem>
                        <SelectItem value="has_samples" className="text-xs">Has Samples</SelectItem>
                        <SelectItem value="no_samples" className="text-xs">Missing Samples</SelectItem>
                        <SelectItem value="has_ui" className="text-xs">Has UI Component</SelectItem>
                        <SelectItem value="no_ui" className="text-xs">Missing UI Component</SelectItem>
                        <SelectItem value="has_output_schema" className="text-xs">Has Output Schema</SelectItem>
                        <SelectItem value="no_output_schema" className="text-xs">Missing Output Schema</SelectItem>
                        <SelectItem value="has_annotations" className="text-xs">Has Annotations</SelectItem>
                        <SelectItem value="no_annotations" className="text-xs">Missing Annotations</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span><span className="font-semibold text-foreground">{filteredTools.length}</span> of {tools.length} tools</span>
                <span><span className="font-semibold text-success">{filteredTools.filter(t => t.is_active).length}</span> active</span>
                <span className="border-l border-border pl-4">
                    <span className="font-semibold text-info">{filteredTools.filter(t => {
                        const c = toolCounts[t.name] ?? { sampleCount: 0, uiComponentCount: 0 };
                        return c.sampleCount > 0 && c.uiComponentCount > 0 && hasOutputSchema(t) && hasAnnotations(t);
                    }).length}</span> fully ready
                </span>
                <span><span className="font-semibold text-success">{filteredTools.filter(t => (toolCounts[t.name]?.sampleCount ?? 0) > 0).length}</span> w/ samples</span>
                <span><span className="font-semibold text-success">{filteredTools.filter(t => (toolCounts[t.name]?.uiComponentCount ?? 0) > 0).length}</span> w/ UI</span>
                <span><span className="font-semibold text-warning">{filteredTools.filter(t => !hasOutputSchema(t)).length}</span> no output schema</span>
                <span><span className="font-semibold text-warning">{filteredTools.filter(t => !hasAnnotations(t)).length}</span> no annotations</span>
            </div>

            {/* Tool list */}
            <div className="space-y-2">
                {filteredTools.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{searchQuery || activeFilterCount > 0 ? "No tools match your filters" : "No tools in the system"}</p>
                    </div>
                ) : (
                    filteredTools.map(tool => (
                        <ToolListItem
                            key={tool.id}
                            tool={tool}
                            counts={toolCounts[tool.name] ?? { sampleCount: 0, uiComponentCount: 0 }}
                            isPending={isPending}
                            onSelect={() => navigateTo(`/administration/mcp-tools/${tool.id}`)}
                            onEdit={(e) => { e.stopPropagation(); navigateTo(`/administration/mcp-tools/${tool.id}/edit`); }}
                            onDelete={(e) => { e.stopPropagation(); handleDeleteTool(tool.id, tool.name); }}
                            onToggleActive={(isActive) => handleToggleActive(tool.id, isActive)}
                            onGenerateUi={(e) => { e.stopPropagation(); navigateTo(`/administration/mcp-tools/${tool.id}/ui`); }}
                            onViewSamples={(e) => { e.stopPropagation(); navigateTo(`/administration/mcp-tools/${tool.id}`); }}
                            onViewIncidents={(e) => { e.stopPropagation(); navigateTo(`/administration/mcp-tools/${tool.id}/incidents`); }}
                        />
                    ))
                )}
            </div>

            {/* Delete confirmation */}
            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(o) => !o && setDeleteConfirmation({ isOpen: false, toolId: null, toolName: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tool</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete <strong>&ldquo;{deleteConfirmation.toolName}&rdquo;</strong>? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Tool List Item ───────────────────────────────────────────────────────────

interface ToolListItemProps {
    tool: Tool;
    counts: ToolCounts;
    isPending: boolean;
    onSelect: () => void;
    onEdit: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onToggleActive: (isActive: boolean) => void;
    onGenerateUi: (e: React.MouseEvent) => void;
    onViewSamples: (e: React.MouseEvent) => void;
    onViewIncidents: (e: React.MouseEvent) => void;
}

function ToolListItem({ tool, counts, isPending, onSelect, onEdit, onDelete, onToggleActive, onGenerateUi, onViewSamples, onViewIncidents }: ToolListItemProps) {
    const icon = mapIcon(tool.icon, tool.category, 16);
    const sourceApp = sourceAppFromPath(tool.function_path);
    const toolHasOutput = hasOutputSchema(tool);
    const toolHasAnnotations = hasAnnotations(tool);
    const toolHasSamples = counts.sampleCount > 0;
    const toolHasUi = counts.uiComponentCount > 0;
    const toolIsReady = toolHasOutput && toolHasAnnotations && toolHasSamples && toolHasUi;

    return (
        // Use div + role="button" so Switch (a <button>) can be nested without hydration error
        <div
            role="button"
            tabIndex={0}
            onClick={isPending ? undefined : onSelect}
            onKeyDown={e => { if (!isPending && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(); } }}
            className={`w-full text-left rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors px-4 py-3 cursor-pointer select-none ${!tool.is_active ? "opacity-60" : ""} ${isPending ? "cursor-wait" : ""}`}
        >
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium truncate">{tool.name}</span>
                        <Badge variant={tool.is_active ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                            {tool.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {sourceApp && sourceApp !== "unknown" && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20">
                                {formatText(sourceApp)}
                            </Badge>
                        )}
                        {tool.category && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{formatText(tool.category)}</Badge>
                        )}
                        {tool.version && (
                            <span className="text-[10px] text-muted-foreground font-mono">v{tool.version}</span>
                        )}
                        {toolIsReady ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-success/50 text-success bg-success/10">
                                fully ready
                            </Badge>
                        ) : (
                            <span className="flex items-center gap-1 flex-wrap">
                                <span title={toolHasSamples ? `${counts.sampleCount} sample(s)` : "No test samples"} className={`text-[10px] px-1 py-0 rounded border ${toolHasSamples ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}`}>
                                    {toolHasSamples ? `${counts.sampleCount} sample${counts.sampleCount !== 1 ? "s" : ""}` : "no samples"}
                                </span>
                                <span title={toolHasUi ? "Has UI component" : "No UI component"} className={`text-[10px] px-1 py-0 rounded border ${toolHasUi ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}`}>
                                    {toolHasUi ? "UI ✓" : "no UI"}
                                </span>
                                {!toolHasOutput && (
                                    <span title="Missing output schema" className="text-[10px] px-1 py-0 rounded bg-warning/10 text-warning border border-warning/30">no output schema</span>
                                )}
                                {!toolHasAnnotations && (
                                    <span title="Missing annotations" className="text-[10px] px-1 py-0 rounded bg-warning/10 text-warning border border-warning/30">no annotations</span>
                                )}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.description}</p>
                    {tool.tags && tool.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                            {tool.tags.slice(0, 4).map(tag => (
                                <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0 rounded">
                                    {tag}
                                </span>
                            ))}
                            {tool.tags.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">+{tool.tags.length - 4}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions — stop propagation so clicks here don't trigger row navigation */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Switch
                        checked={tool.is_active ?? false}
                        onCheckedChange={onToggleActive}
                        className="scale-75"
                    />
                    <Button variant="ghost" size="sm" onClick={onViewSamples} title="View Samples" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                        <FlaskConical className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onGenerateUi} title="UI Component" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
                        <Wand2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onViewIncidents} title="Incidents" className="h-7 w-7 p-0 text-muted-foreground hover:text-warning">
                        <Bug className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onEdit} title="Edit Tool" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDelete} title="Delete Tool" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
