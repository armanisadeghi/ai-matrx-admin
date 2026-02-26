"use client";

import React, { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    Save,
    X,
    ChevronDown,
    ChevronUp,
    Settings,
    Code,
    Tag,
    FileText,
    Calendar,
    Hash,
    ToggleLeft,
    ToggleRight,
    Paintbrush,
    Bug,
    Wand2,
    FlaskConical,
    ArrowLeft,
    Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import IconInputWithValidation from "@/components/official/IconInputWithValidation";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useTools } from "@/hooks/useTools";
import { useIsMobile } from "@/hooks/use-mobile";
import { mapIcon } from "@/utils/icons/icon-mapper";
import { formatText } from "@/utils/text/text-case-converter";
import { ToolUiComponentEditor } from "./ToolUiComponentEditor";
import { ToolUiIncidentViewer } from "./ToolUiIncidentViewer";
import { ToolUiComponentGenerator } from "./ToolUiComponentGenerator";
import { ToolTestSamplesViewer } from "./ToolTestSamplesViewer";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface EditingTool extends Tool {
    _isEditing?: boolean;
}

type DetailTab = "samples" | "generate" | "edit-ui" | "incidents";

// ─── Main Component ───────────────────────────────────────────────────────────

export function McpToolsManager() {
    const { databaseTools, isLoading, error, refetch } = useTools({ autoFetch: true });
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [tools, setTools] = useState<EditingTool[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedTool, setSelectedTool] = useState<EditingTool | null>(null);
    const [detailTab, setDetailTab] = useState<DetailTab>("samples");
    const [editingTool, setEditingTool] = useState<EditingTool | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        toolId: string | null;
        toolName: string | null;
    }>({ isOpen: false, toolId: null, toolName: null });

    useEffect(() => {
        setTools(databaseTools.map(tool => ({ ...tool, _isEditing: false })));
    }, [databaseTools]);

    const categories = React.useMemo(() => {
        const cats = new Set(tools.map(tool => tool.category).filter(Boolean));
        return ["all", ...Array.from(cats)].sort();
    }, [tools]);

    const filteredTools = React.useMemo(() => {
        return tools.filter(tool => {
            const matchesSearch = !searchQuery ||
                tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [tools, searchQuery, selectedCategory]);

    const handleSaveTool = async (tool: EditingTool) => {
        const isNew = !tool.id;
        const url = isNew ? "/api/admin/tools" : `/api/admin/tools/${tool.id}`;
        const { _isEditing, ...cleanTool } = tool;
        const response = await fetch(url, {
            method: isNew ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cleanTool),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to save");
        }
        toast({ title: "Saved", description: `Tool ${isNew ? "created" : "updated"} successfully` });
        setEditingTool(null);
        setIsCreating(false);
        await refetch();
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
            if (selectedTool?.id === deleteConfirmation.toolId) setSelectedTool(null);
            await refetch();
        } catch (err) {
            toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setDeleteConfirmation({ isOpen: false, toolId: null, toolName: null });
        }
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
            if (selectedTool?.id === toolId) setSelectedTool(prev => prev ? { ...prev, is_active: isActive } : null);
        } catch {
            toast({ title: "Error updating tool", variant: "destructive" });
            setTools(prev => prev.map(t => t.id === toolId ? { ...t, is_active: !isActive } : t));
        }
    };

    // ── Edit / Create forms ────────────────────────────────────────────────────

    if (isCreating || editingTool) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => { setIsCreating(false); setEditingTool(null); }} className="gap-1.5">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tools
                </Button>
                <ToolEditor
                    tool={editingTool}
                    onSave={handleSaveTool}
                    onCancel={() => { setIsCreating(false); setEditingTool(null); }}
                    isMobile={isMobile}
                />
            </div>
        );
    }

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

    // ── Detail panel ──────────────────────────────────────────────────────────

    if (selectedTool) {
        return (
            <div className="space-y-3">
                {/* Back + tool header */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTool(null)} className="gap-1.5 shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                        Tools
                    </Button>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-semibold truncate">{selectedTool.name}</span>
                        <Badge variant={selectedTool.is_active ? "default" : "secondary"} className="text-[10px]">
                            {selectedTool.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {selectedTool.category && (
                            <Badge variant="outline" className="text-[10px]">{formatText(selectedTool.category)}</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                        <Switch
                            checked={selectedTool.is_active ?? false}
                            onCheckedChange={(v) => handleToggleActive(selectedTool.id, v)}
                        />
                        <Button variant="outline" size="sm" onClick={() => setEditingTool(selectedTool)} className="gap-1.5 h-8 text-xs">
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTool(selectedTool.id, selectedTool.name)}
                            className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Detail tabs */}
                <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as DetailTab)}>
                    <TabsList>
                        <TabsTrigger value="samples" className="gap-1.5 text-xs">
                            <FlaskConical className="h-3.5 w-3.5" />
                            Samples
                        </TabsTrigger>
                        <TabsTrigger value="generate" className="gap-1.5 text-xs">
                            <Wand2 className="h-3.5 w-3.5" />
                            Generate UI
                        </TabsTrigger>
                        <TabsTrigger value="edit-ui" className="gap-1.5 text-xs">
                            <Paintbrush className="h-3.5 w-3.5" />
                            Edit UI
                        </TabsTrigger>
                        <TabsTrigger value="incidents" className="gap-1.5 text-xs">
                            <Bug className="h-3.5 w-3.5" />
                            Incidents
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="samples" className="mt-3">
                        <ToolTestSamplesViewer
                            toolName={selectedTool.name}
                            toolId={selectedTool.id}
                        />
                    </TabsContent>

                    <TabsContent value="generate" className="mt-3">
                        <ToolUiComponentGenerator
                            tools={[selectedTool]}
                            preselectedToolName={selectedTool.name}
                            onComplete={() => { toast({ title: "Component generated", description: "Active on next tool use." }); }}
                        />
                    </TabsContent>

                    <TabsContent value="edit-ui" className="mt-3">
                        <ToolUiComponentEditor
                            toolName={selectedTool.name}
                            toolId={selectedTool.id}
                            onSaved={() => toast({ title: "Saved", description: "UI component saved." })}
                        />
                    </TabsContent>

                    <TabsContent value="incidents" className="mt-3">
                        <ToolUiIncidentViewer toolName={selectedTool.name} />
                    </TabsContent>
                </Tabs>

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

    // ── Tool list ─────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4 pb-safe">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tools…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10"
                        style={{ fontSize: "16px" }}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-44">
                        <Filter className="h-3.5 w-3.5 mr-1.5" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                                {cat === "all" ? "All Categories" : formatText(cat)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={refetch} className="h-8 gap-1.5">
                        <Settings className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button size="sm" onClick={() => setIsCreating(true)} className="h-8 gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Add Tool
                    </Button>
                </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 text-xs text-muted-foreground">
                <span><span className="font-semibold text-foreground">{filteredTools.length}</span> tools</span>
                <span><span className="font-semibold text-success">{filteredTools.filter(t => t.is_active).length}</span> active</span>
                <span><span className="font-semibold text-muted-foreground">{filteredTools.filter(t => !t.is_active).length}</span> inactive</span>
            </div>

            {/* Tool list */}
            <div className="space-y-2">
                {filteredTools.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{searchQuery || selectedCategory !== "all" ? "No tools match your filters" : "No tools in the system"}</p>
                    </div>
                ) : (
                    filteredTools.map(tool => (
                        <ToolListItem
                            key={tool.id}
                            tool={tool}
                            onSelect={() => {
                                setSelectedTool(tool);
                                setDetailTab("samples");
                            }}
                            onEdit={(e) => { e.stopPropagation(); setEditingTool(tool); }}
                            onDelete={(e) => { e.stopPropagation(); handleDeleteTool(tool.id, tool.name); }}
                            onToggleActive={(isActive) => handleToggleActive(tool.id, isActive)}
                            onGenerateUi={(e) => { e.stopPropagation(); setSelectedTool(tool); setDetailTab("generate"); }}
                            onViewSamples={(e) => { e.stopPropagation(); setSelectedTool(tool); setDetailTab("samples"); }}
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
    tool: EditingTool;
    onSelect: () => void;
    onEdit: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onToggleActive: (isActive: boolean) => void;
    onGenerateUi: (e: React.MouseEvent) => void;
    onViewSamples: (e: React.MouseEvent) => void;
}

function ToolListItem({ tool, onSelect, onEdit, onDelete, onToggleActive, onGenerateUi, onViewSamples }: ToolListItemProps) {
    const icon = mapIcon(tool.icon, tool.category, 16);

    return (
        <button
            onClick={onSelect}
            className={`w-full text-left rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors px-4 py-3 ${!tool.is_active ? "opacity-60" : ""}`}
        >
            <div className="flex items-center gap-3">
                {/* Icon + name */}
                <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium truncate">{tool.name}</span>
                        <Badge variant={tool.is_active ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                            {tool.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {tool.category && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{formatText(tool.category)}</Badge>
                        )}
                        {tool.version && (
                            <span className="text-[10px] text-muted-foreground font-mono">v{tool.version}</span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Switch
                        checked={tool.is_active ?? false}
                        onCheckedChange={onToggleActive}
                        className="scale-75"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onViewSamples}
                        title="View Test Samples"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                        <FlaskConical className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onGenerateUi}
                        title="Generate UI Component"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                    >
                        <Wand2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                        title="Edit Tool"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        title="Delete Tool"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </button>
    );
}

// ─── Tool Editor ──────────────────────────────────────────────────────────────

interface ToolEditorProps {
    tool: EditingTool | null;
    onSave: (tool: EditingTool) => Promise<void>;
    onCancel: () => void;
    isMobile: boolean;
}

function ToolEditor({ tool, onSave, onCancel, isMobile }: ToolEditorProps) {
    const { toast } = useToast();
    const [editedTool, setEditedTool] = useState<EditingTool>(() =>
        tool || {
            id: "",
            name: "",
            description: "",
            parameters: { type: "object", properties: {}, required: [] },
            output_schema: { type: "object", properties: {} },
            annotations: [],
            function_path: "",
            category: "",
            tags: [],
            icon: "",
            is_active: true,
            version: "1.0.0",
        }
    );
    const [activeTab, setActiveTab] = useState("basic");
    const [isSaving, setIsSaving] = useState(false);
    const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

    const handleSave = async () => {
        if (!editedTool.name || !editedTool.description || !editedTool.function_path) {
            toast({ title: "Missing required fields", description: "Name, Description, and Function Path are required.", variant: "destructive" });
            return;
        }
        if (Object.keys(jsonErrors).length > 0) {
            toast({ title: "Fix JSON errors before saving", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            await onSave(editedTool);
        } catch (err) {
            toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const setField = (field: string, value: unknown) => setEditedTool(prev => ({ ...prev, [field]: value }));

    const setJsonField = (field: string, value: string) => {
        try {
            setEditedTool(prev => ({ ...prev, [field]: JSON.parse(value) }));
            setJsonErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
        } catch (e) {
            setJsonErrors(prev => ({ ...prev, [field]: e instanceof Error ? e.message : "Invalid JSON" }));
        }
    };

    const fields = {
        basic: (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Tool Name <span className="text-destructive">*</span></Label>
                        <Input value={editedTool.name} onChange={e => setField("name", e.target.value)} placeholder="e.g., core_web_search" className="font-mono" style={{ fontSize: "16px" }} />
                    </div>
                    <div>
                        <Label>Category</Label>
                        <Input value={editedTool.category || ""} onChange={e => setField("category", e.target.value)} placeholder="e.g., core, web, data" style={{ fontSize: "16px" }} />
                    </div>
                </div>
                <div>
                    <Label>Description <span className="text-destructive">*</span></Label>
                    <Textarea value={editedTool.description} onChange={e => setField("description", e.target.value)} rows={3} style={{ fontSize: "16px" }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label>Icon</Label>
                        <IconInputWithValidation value={editedTool.icon || ""} onChange={v => setField("icon", v)} placeholder="e.g., Search" />
                    </div>
                    <div>
                        <Label>Version</Label>
                        <Input value={editedTool.version || ""} onChange={e => setField("version", e.target.value)} placeholder="1.0.0" style={{ fontSize: "16px" }} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                        <Switch checked={editedTool.is_active ?? true} onCheckedChange={v => setField("is_active", v)} />
                        <Label>Active</Label>
                    </div>
                </div>
                <div>
                    <Label>Function Path <span className="text-destructive">*</span></Label>
                    <Input value={editedTool.function_path} onChange={e => setField("function_path", e.target.value)} className="font-mono" style={{ fontSize: "16px" }} />
                </div>
                <div>
                    <Label>Tags (comma-separated)</Label>
                    <Input
                        value={editedTool.tags?.join(", ") || ""}
                        onChange={e => setField("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                        style={{ fontSize: "16px" }}
                    />
                </div>
            </div>
        ),
        parameters: (
            <div className="space-y-2">
                <Label>Parameters Schema (JSON)</Label>
                <Textarea
                    value={JSON.stringify(editedTool.parameters, null, 2)}
                    onChange={e => setJsonField("parameters", e.target.value)}
                    className={`font-mono text-sm ${jsonErrors.parameters ? "border-destructive" : ""}`}
                    style={{ fontSize: "14px" }}
                    rows={20}
                />
                {jsonErrors.parameters && <p className="text-xs text-destructive">JSON Error: {jsonErrors.parameters}</p>}
            </div>
        ),
        output: (
            <div className="space-y-2">
                <Label>Output Schema (JSON)</Label>
                <Textarea
                    value={JSON.stringify(editedTool.output_schema, null, 2)}
                    onChange={e => setJsonField("output_schema", e.target.value)}
                    className={`font-mono text-sm ${jsonErrors.output_schema ? "border-destructive" : ""}`}
                    style={{ fontSize: "14px" }}
                    rows={20}
                />
                {jsonErrors.output_schema && <p className="text-xs text-destructive">JSON Error: {jsonErrors.output_schema}</p>}
            </div>
        ),
        advanced: (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Annotations (JSON Array)</Label>
                    <Textarea
                        value={JSON.stringify(editedTool.annotations, null, 2)}
                        onChange={e => setJsonField("annotations", e.target.value)}
                        className={`font-mono text-sm ${jsonErrors.annotations ? "border-destructive" : ""}`}
                        style={{ fontSize: "14px" }}
                        rows={8}
                    />
                    {jsonErrors.annotations && <p className="text-xs text-destructive">JSON Error: {jsonErrors.annotations}</p>}
                </div>
                {tool && (
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
                        <div><span className="block font-medium text-foreground mb-1">Tool ID</span><span className="font-mono">{tool.id}</span></div>
                        <div><span className="block font-medium text-foreground mb-1">Created</span>{tool.created_at ? new Date(tool.created_at).toLocaleString() : "N/A"}</div>
                    </div>
                )}
            </div>
        ),
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{tool ? `Edit: ${tool.name}` : "Create New Tool"}</CardTitle>
            </CardHeader>
            <CardContent>
                {isMobile ? (
                    <div className="space-y-6">
                        <div className="h-px bg-border" /><h3 className="text-sm font-medium">Basic Info</h3>{fields.basic}
                        <div className="h-px bg-border" /><h3 className="text-sm font-medium">Parameters</h3>{fields.parameters}
                        <div className="h-px bg-border" /><h3 className="text-sm font-medium">Output Schema</h3>{fields.output}
                        <div className="h-px bg-border" /><h3 className="text-sm font-medium">Advanced</h3>{fields.advanced}
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="parameters">Parameters</TabsTrigger>
                            <TabsTrigger value="output">Output Schema</TabsTrigger>
                            <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        </TabsList>
                        <TabsContent value="basic" className="mt-4">{fields.basic}</TabsContent>
                        <TabsContent value="parameters" className="mt-4">{fields.parameters}</TabsContent>
                        <TabsContent value="output" className="mt-4">{fields.output}</TabsContent>
                        <TabsContent value="advanced" className="mt-4">{fields.advanced}</TabsContent>
                    </Tabs>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isSaving ? "Saving…" : "Save Tool"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
