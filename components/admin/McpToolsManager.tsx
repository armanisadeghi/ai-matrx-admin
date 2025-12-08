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
    Eye, 
    EyeOff,
    Code,
    Tag,
    FileText,
    Calendar,
    Hash,
    ToggleLeft,
    ToggleRight
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTools } from "@/hooks/useTools";
import { mapIcon } from "@/utils/icons/icon-mapper";
import { formatText } from "@/utils/text/text-case-converter";

interface Tool {
    id: string;
    name: string;
    description: string;
    parameters: any;
    output_schema?: any;
    annotations?: any[];
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

export function McpToolsManager() {
    const { databaseTools, isLoading, error, refetch } = useTools({ autoFetch: true });
    const { toast } = useToast();
    const [tools, setTools] = useState<EditingTool[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [editingTool, setEditingTool] = useState<EditingTool | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        toolId: string | null;
        toolName: string | null;
    }>({
        isOpen: false,
        toolId: null,
        toolName: null,
    });

    // Update tools when database tools change
    useEffect(() => {
        setTools(databaseTools.map(tool => ({ ...tool, _isEditing: false })));
    }, [databaseTools]);

    // Get unique categories
    const categories = React.useMemo(() => {
        const cats = new Set(tools.map(tool => tool.category).filter(Boolean));
        return ["all", ...Array.from(cats)].sort();
    }, [tools]);

    // Filter tools
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

    const handleEditTool = (tool: Tool) => {
        setEditingTool({ ...tool });
    };

    const handleSaveTool = async (tool: EditingTool) => {
        try {
            const isNewTool = !tool.id;
            const url = isNewTool ? '/api/admin/tools' : `/api/admin/tools/${tool.id}`;
            const method = isNewTool ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tool),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save tool');
            }

            toast({
                title: 'Success',
                description: `Tool ${isNewTool ? 'created' : 'updated'} successfully`,
            });

            setEditingTool(null);
            await refetch();
        } catch (error) {
            console.error('Error saving tool:', error);
            toast({
                title: 'Error',
                description: `Failed to save tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: 'destructive',
            });
        }
    };

    const handleDeleteTool = async (toolId: string, toolName: string) => {
        setDeleteConfirmation({
            isOpen: true,
            toolId,
            toolName,
        });
    };

    const confirmDelete = async () => {
        const { toolId } = deleteConfirmation;
        
        if (!toolId) return;
        
        try {
            const response = await fetch(`/api/admin/tools/${toolId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete tool');
            }

            toast({
                title: 'Success',
                description: 'Tool deleted successfully',
            });

            setDeleteConfirmation({ isOpen: false, toolId: null, toolName: null });
            await refetch();
        } catch (error) {
            console.error('Error deleting tool:', error);
            toast({
                title: 'Error',
                description: `Failed to delete tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: 'destructive',
            });
        }
    };

    const handleToggleActive = async (toolId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/admin/tools/${toolId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: isActive }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update tool');
            }

            // Update local state immediately for better UX
            setTools(prev => prev.map(tool => 
                tool.id === toolId ? { ...tool, is_active: isActive } : tool
            ));

            toast({
                title: 'Success',
                description: `Tool ${isActive ? 'activated' : 'deactivated'} successfully`,
            });
        } catch (error) {
            console.error('Error toggling tool status:', error);
            toast({
                title: 'Error',
                description: `Failed to update tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: 'destructive',
            });
            // Revert the change on error
            setTools(prev => prev.map(tool => 
                tool.id === toolId ? { ...tool, is_active: !isActive } : tool
            ));
        }
    };

    const toggleExpanded = (toolId: string) => {
        setExpandedTools(prev => {
            const newSet = new Set(prev);
            if (newSet.has(toolId)) {
                newSet.delete(toolId);
            } else {
                newSet.add(toolId);
            }
            return newSet;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading tools...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                        <X className="h-5 w-5" />
                        <span>Error loading tools: {error}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header Controls */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search tools..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Category Filter */}
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-48">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Filter by category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(category => (
                                        <SelectItem key={category} value={category}>
                                            {category === "all" ? "All Categories" : formatText(category)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refetch}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Tool
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                                    <DialogHeader className="flex-shrink-0">
                                        <DialogTitle>Create New Tool</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex-1 overflow-y-auto">
                                        <ToolEditor
                                            tool={null}
                                            onSave={(tool) => {
                                                handleSaveTool(tool);
                                                setIsCreateDialogOpen(false);
                                            }}
                                            onCancel={() => setIsCreateDialogOpen(false)}
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 mt-4 pt-4 border-t border-border">
                        <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{filteredTools.length}</span>
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                                {filteredTools.length === 1 ? 'tool' : 'tools'} shown
                            </span>
                        </div>
                        <div className="text-sm">
                            <span className="font-medium text-green-600 dark:text-green-400">
                                {filteredTools.filter(t => t.is_active).length}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-1">active</span>
                        </div>
                        <div className="text-sm">
                            <span className="font-medium text-gray-500 dark:text-gray-400">
                                {filteredTools.filter(t => !t.is_active).length}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-1">inactive</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tools List */}
            <div className="space-y-4">
                {filteredTools.map((tool) => (
                    <ToolCard
                        key={tool.id}
                        tool={tool}
                        isExpanded={expandedTools.has(tool.id)}
                        onToggleExpanded={() => toggleExpanded(tool.id)}
                        onEdit={() => handleEditTool(tool)}
                        onDelete={() => handleDeleteTool(tool.id, tool.name)}
                        onToggleActive={(isActive) => handleToggleActive(tool.id, isActive)}
                    />
                ))}

                {filteredTools.length === 0 && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-12">
                                <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    No tools found
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {searchQuery || selectedCategory !== "all" 
                                        ? "Try adjusting your search or filters"
                                        : "No tools available in the system"
                                    }
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingTool} onOpenChange={() => setEditingTool(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle>Edit Tool</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                        {editingTool && (
                            <ToolEditor
                                tool={editingTool}
                                onSave={handleSaveTool}
                                onCancel={() => setEditingTool(null)}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog 
                open={deleteConfirmation.isOpen} 
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteConfirmation({ isOpen: false, toolId: null, toolName: null });
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tool</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>"{deleteConfirmation.toolName}"</strong>?{' '}
                            This action cannot be undone and will permanently remove the tool from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Tool Card Component
interface ToolCardProps {
    tool: EditingTool;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: (isActive: boolean) => void;
}

function ToolCard({ tool, isExpanded, onToggleExpanded, onEdit, onDelete, onToggleActive }: ToolCardProps) {
    const icon = mapIcon(tool.icon, tool.category, 20);
    
    return (
        <Card className={`transition-all ${!tool.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="pt-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {formatText(tool.name)}
                                </h3>
                                <Badge variant={tool.is_active ? "default" : "secondary"}>
                                    {tool.is_active ? "Active" : "Inactive"}
                                </Badge>
                                {tool.category && (
                                    <Badge variant="outline">
                                        {formatText(tool.category)}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {tool.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-mono">{tool.name}</span>
                                <span>v{tool.version}</span>
                                {tool.tags && tool.tags.length > 0 && (
                                    <div className="flex space-x-1">
                                        {tool.tags.slice(0, 3).map(tag => (
                                            <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {tool.tags.length > 3 && (
                                            <span className="text-[10px]">+{tool.tags.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <Switch
                            checked={tool.is_active}
                            onCheckedChange={onToggleActive}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleExpanded}
                        >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onEdit}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="border-t border-border pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <Label className="font-medium text-gray-700 dark:text-gray-300">Function Path</Label>
                                <p className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                                    {tool.function_path}
                                </p>
                            </div>
                            <div>
                                <Label className="font-medium text-gray-700 dark:text-gray-300">Created</Label>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    {tool.created_at ? new Date(tool.created_at).toLocaleString() : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Parameters Preview */}
                        {tool.parameters && (
                            <div>
                                <Label className="font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Parameters Schema
                                </Label>
                                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto max-h-48 overflow-y-auto">
                                    {JSON.stringify(tool.parameters, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Output Schema Preview */}
                        {tool.output_schema && (
                            <div>
                                <Label className="font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Output Schema
                                </Label>
                                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto max-h-48 overflow-y-auto">
                                    {JSON.stringify(tool.output_schema, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Tool Editor Component
interface ToolEditorProps {
    tool: EditingTool | null;
    onSave: (tool: EditingTool) => void;
    onCancel: () => void;
}

function ToolEditor({ tool, onSave, onCancel }: ToolEditorProps) {
    const { toast } = useToast();
    const [editedTool, setEditedTool] = useState<EditingTool>(() => 
        tool || {
            id: '',
            name: '',
            description: '',
            parameters: { type: 'object', properties: {}, required: [] },
            output_schema: { type: 'object', properties: {} },
            annotations: [],
            function_path: '',
            category: '',
            tags: [],
            icon: '',
            is_active: true,
            version: '1.0.0'
        }
    );

    const [activeTab, setActiveTab] = useState("basic");
    const [isSaving, setIsSaving] = useState(false);
    const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

    const handleSave = async () => {
        // Validate required fields
        if (!editedTool.name || !editedTool.description || !editedTool.function_path) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields: Name, Description, and Function Path',
                variant: 'destructive',
            });
            return;
        }

        // Check for JSON errors
        if (Object.keys(jsonErrors).length > 0) {
            toast({
                title: 'Validation Error',
                description: 'Please fix JSON errors before saving',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            await onSave(editedTool);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldChange = (field: string, value: any) => {
        setEditedTool(prev => ({ ...prev, [field]: value }));
    };

    const handleJsonFieldChange = (field: string, value: string) => {
        try {
            const parsed = JSON.parse(value);
            setEditedTool(prev => ({ ...prev, [field]: parsed }));
            // Clear error if JSON is now valid
            setJsonErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        } catch (e) {
            // Set error for invalid JSON
            setJsonErrors(prev => ({
                ...prev,
                [field]: e instanceof Error ? e.message : 'Invalid JSON'
            }));
        }
    };

    const handleTagsChange = (value: string) => {
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        setEditedTool(prev => ({ ...prev, tags }));
    };

    return (
        <div className="space-y-6 p-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="parameters">Parameters</TabsTrigger>
                    <TabsTrigger value="output">Output Schema</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Tool Name (Identifier)</Label>
                            <Input
                                id="name"
                                value={editedTool.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                placeholder="e.g., core_web_search"
                                className="font-mono"
                            />
                        </div>
                        <div>
                            <Label htmlFor="category">Category</Label>
                            <Input
                                id="category"
                                value={editedTool.category || ''}
                                onChange={(e) => handleFieldChange('category', e.target.value)}
                                placeholder="e.g., core, web, data"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={editedTool.description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            placeholder="Describe what this tool does..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="icon">Icon Name</Label>
                            <IconInputWithValidation
                                id="icon"
                                value={editedTool.icon || ''}
                                onChange={(value) => handleFieldChange('icon', value)}
                                placeholder="e.g., Search"
                            />
                        </div>
                        <div>
                            <Label htmlFor="version">Version</Label>
                            <Input
                                id="version"
                                value={editedTool.version || ''}
                                onChange={(e) => handleFieldChange('version', e.target.value)}
                                placeholder="e.g., 1.0.0"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_active"
                                checked={editedTool.is_active}
                                onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="function_path">Function Path</Label>
                        <Input
                            id="function_path"
                            value={editedTool.function_path}
                            onChange={(e) => handleFieldChange('function_path', e.target.value)}
                            placeholder="e.g., scraper.db_version.tools_functions.search.search_tool_util"
                            className="font-mono"
                        />
                    </div>

                    <div>
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input
                            id="tags"
                            value={editedTool.tags?.join(', ') || ''}
                            onChange={(e) => handleTagsChange(e.target.value)}
                            placeholder="e.g., core, web, search"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="parameters" className="space-y-4">
                    <div>
                        <Label htmlFor="parameters">Parameters Schema (JSON)</Label>
                        <Textarea
                            id="parameters"
                            value={JSON.stringify(editedTool.parameters, null, 2)}
                            onChange={(e) => handleJsonFieldChange('parameters', e.target.value)}
                            className={`font-mono text-sm ${jsonErrors.parameters ? 'border-red-500 dark:border-red-400' : ''}`}
                            rows={15}
                        />
                        {jsonErrors.parameters ? (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                JSON Error: {jsonErrors.parameters}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Define the JSON schema for tool parameters. Must be valid JSON.
                            </p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="output" className="space-y-4">
                    <div>
                        <Label htmlFor="output_schema">Output Schema (JSON)</Label>
                        <Textarea
                            id="output_schema"
                            value={JSON.stringify(editedTool.output_schema, null, 2)}
                            onChange={(e) => handleJsonFieldChange('output_schema', e.target.value)}
                            className={`font-mono text-sm ${jsonErrors.output_schema ? 'border-red-500 dark:border-red-400' : ''}`}
                            rows={15}
                        />
                        {jsonErrors.output_schema ? (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                JSON Error: {jsonErrors.output_schema}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Define the JSON schema for tool output. Must be valid JSON.
                            </p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                    <div>
                        <Label htmlFor="annotations">Annotations (JSON Array)</Label>
                        <Textarea
                            id="annotations"
                            value={JSON.stringify(editedTool.annotations, null, 2)}
                            onChange={(e) => handleJsonFieldChange('annotations', e.target.value)}
                            className={`font-mono text-sm ${jsonErrors.annotations ? 'border-red-500 dark:border-red-400' : ''}`}
                            rows={8}
                        />
                        {jsonErrors.annotations ? (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                JSON Error: {jsonErrors.annotations}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Additional metadata and annotations for the tool.
                            </p>
                        )}
                    </div>

                    {tool && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                            <div>
                                <Label>Tool ID</Label>
                                <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                                    {tool.id}
                                </p>
                            </div>
                            <div>
                                <Label>Created At</Label>
                                <p className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                                    {tool.created_at ? new Date(tool.created_at).toLocaleString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Tool'}
                </Button>
            </div>
        </div>
    );
}
