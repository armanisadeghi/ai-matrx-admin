'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Search,
    Save,
    X,
    Edit2,
    Settings,
    CheckCircle2,
    Circle,
    Sparkles,
    Menu,
    LayoutGrid,
    Mouse,
    Star,
    AlertCircle,
    RefreshCw,
    Copy,
    ExternalLink
} from 'lucide-react';
import type { SystemPromptDB } from '@/types/system-prompts-db';
import { useSystemPrompts } from '@/hooks/useSystemPrompts';

interface SystemPromptsManagerProps {
    className?: string;
}

export function SystemPromptsManager({ className }: SystemPromptsManagerProps) {
    const { systemPrompts, loading, error, refetch } = useSystemPrompts({ autoFetch: true });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedPrompt, setSelectedPrompt] = useState<SystemPromptDB | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Edit form state
    const [editData, setEditData] = useState<Partial<SystemPromptDB>>({});

    // Filter prompts
    const filteredPrompts = React.useMemo(() => {
        return systemPrompts.filter(prompt => {
            // Search filter
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                if (
                    !prompt.name.toLowerCase().includes(search) &&
                    !prompt.system_prompt_id.toLowerCase().includes(search) &&
                    !prompt.description?.toLowerCase().includes(search)
                ) {
                    return false;
                }
            }

            // Status filter
            if (selectedStatus !== 'all' && prompt.status !== selectedStatus) {
                return false;
            }

            // Category filter
            if (selectedCategory !== 'all' && prompt.category !== selectedCategory) {
                return false;
            }

            return true;
        });
    }, [systemPrompts, searchQuery, selectedStatus, selectedCategory]);

    // Get unique categories
    const categories = React.useMemo(() => {
        const cats = new Set(systemPrompts.map(p => p.category));
        return Array.from(cats).sort();
    }, [systemPrompts]);

    // Load edit data when selecting a prompt
    useEffect(() => {
        if (selectedPrompt) {
            setEditData(selectedPrompt);
            setHasUnsavedChanges(false);
        }
    }, [selectedPrompt]);

    const handlePromptSelect = (prompt: SystemPromptDB) => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Discard them?')) {
                return;
            }
        }
        setSelectedPrompt(prompt);
        setIsEditDialogOpen(true);
    };

    const handleEditChange = (field: keyof SystemPromptDB, value: any) => {
        setEditData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedPrompt || !editData.id) return;

        try {
            setIsSaving(true);

            const response = await fetch(`/api/system-prompts/${editData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editData.name,
                    description: editData.description,
                    display_config: editData.display_config,
                    placement_config: editData.placement_config,
                    category: editData.category,
                    subcategory: editData.subcategory,
                    tags: editData.tags,
                    sort_order: editData.sort_order,
                    is_active: editData.is_active,
                    is_featured: editData.is_featured,
                    status: editData.status,
                    update_notes: `Updated via admin interface at ${new Date().toISOString()}`
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || 'Failed to update system prompt');
            }

            toast.success('System prompt updated successfully');
            setHasUnsavedChanges(false);
            await refetch();
        } catch (error) {
            console.error('Error saving changes:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (promptId: string) => {
        if (!confirm('Are you sure you want to delete this system prompt? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/system-prompts/${promptId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete system prompt');
            }

            toast.success('System prompt deleted successfully');
            if (selectedPrompt?.id === promptId) {
                setSelectedPrompt(null);
                setIsEditDialogOpen(false);
            }
            await refetch();
        } catch (error) {
            console.error('Error deleting prompt:', error);
            toast.error('Failed to delete system prompt');
        }
    };

    const handleDuplicate = async (prompt: SystemPromptDB) => {
        try {
            const response = await fetch('/api/system-prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_prompt_id: `${prompt.system_prompt_id}-copy`,
                    name: `${prompt.name} (Copy)`,
                    description: prompt.description,
                    prompt_snapshot: prompt.prompt_snapshot,
                    display_config: prompt.display_config,
                    placement_config: prompt.placement_config,
                    category: prompt.category,
                    subcategory: prompt.subcategory,
                    tags: prompt.tags,
                    sort_order: prompt.sort_order,
                    required_variables: prompt.required_variables,
                    optional_variables: prompt.optional_variables,
                    variable_mappings: prompt.variable_mappings,
                    is_active: false, // Start as inactive
                    status: 'draft', // Start as draft
                    metadata: { ...prompt.metadata, duplicated_from: prompt.id }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to duplicate');
            }

            toast.success('System prompt duplicated successfully');
            await refetch();
        } catch (error) {
            console.error('Error duplicating:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to duplicate');
        }
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="p-6 max-w-md">
                    <div className="flex items-center gap-3 text-destructive">
                        <AlertCircle className="h-6 w-6" />
                        <div>
                            <h3 className="font-semibold">Error Loading System Prompts</h3>
                            <p className="text-sm text-muted-foreground">{error.message}</p>
                        </div>
                    </div>
                    <Button onClick={() => refetch()} className="mt-4 w-full" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex-none border-b border-border bg-card p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-primary" />
                            System Prompts Manager
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage global system prompts available throughout the application
                        </p>
                    </div>
                    <Button onClick={() => refetch()} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex-none border-b border-border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search prompts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Badge variant="secondary" className="ml-auto">
                        {filteredPrompts.length} of {systemPrompts.length} prompts
                    </Badge>
                </div>
            </div>

            {/* Prompts Grid */}
            <ScrollArea className="flex-1">
                <div className="p-6">
                    {loading && systemPrompts.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Loading system prompts...</p>
                            </div>
                        </div>
                    ) : filteredPrompts.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-1">No prompts found</h3>
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery
                                        ? 'Try adjusting your search or filters'
                                        : 'Convert a prompt to a system prompt to get started'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPrompts.map(prompt => (
                                <Card
                                    key={prompt.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => handlePromptSelect(prompt)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    {prompt.is_featured && (
                                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                    )}
                                                    {prompt.name}
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-1">
                                                    {prompt.system_prompt_id}
                                                </CardDescription>
                                            </div>
                                            {prompt.is_active ? (
                                                <Eye className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {prompt.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {prompt.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant={prompt.status === 'published' ? 'default' : 'secondary'}>
                                                {prompt.status}
                                            </Badge>
                                            <Badge variant="outline">{prompt.category}</Badge>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {prompt.placement_config?.contextMenu?.enabled && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Mouse className="h-3 w-3 mr-1" />
                                                    Menu
                                                </Badge>
                                            )}
                                            {prompt.placement_config?.card?.enabled && (
                                                <Badge variant="outline" className="text-xs">
                                                    <LayoutGrid className="h-3 w-3 mr-1" />
                                                    Card
                                                </Badge>
                                            )}
                                            {prompt.placement_config?.button?.enabled && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Menu className="h-3 w-3 mr-1" />
                                                    Button
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                            <span>v{prompt.version}</span>
                                            <span>{prompt.total_executions} executions</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Edit System Prompt
                        </DialogTitle>
                        <DialogDescription>
                            Configure how and where this prompt appears in the application
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="placement">Placement</TabsTrigger>
                            <TabsTrigger value="display">Display</TabsTrigger>
                            <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        </TabsList>

                        <ScrollArea className="flex-1 mt-4">
                            {/* General Tab */}
                            <TabsContent value="general" className="space-y-4 pr-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={editData.name || ''}
                                        onChange={(e) => handleEditChange('name', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={editData.description || ''}
                                        onChange={(e) => handleEditChange('description', e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Select
                                            value={editData.category}
                                            onValueChange={(v) => handleEditChange('category', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="general">General</SelectItem>
                                                <SelectItem value="content">Content</SelectItem>
                                                <SelectItem value="coding">Coding</SelectItem>
                                                <SelectItem value="analysis">Analysis</SelectItem>
                                                <SelectItem value="creative">Creative</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Sort Order</Label>
                                        <Input
                                            type="number"
                                            value={editData.sort_order || 0}
                                            onChange={(e) => handleEditChange('sort_order', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select
                                            value={editData.status}
                                            onValueChange={(v) => handleEditChange('status', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="published">Published</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-4 pt-7">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={editData.is_active}
                                                onCheckedChange={(checked) => handleEditChange('is_active', checked)}
                                            />
                                            <span className="text-sm">Active</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={editData.is_featured}
                                                onCheckedChange={(checked) => handleEditChange('is_featured', checked)}
                                            />
                                            <span className="text-sm">Featured</span>
                                        </label>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Placement Tab */}
                            <TabsContent value="placement" className="space-y-6 pr-4">
                                <PlacementSection
                                    title="Context Menu"
                                    description="Right-click menu in text areas"
                                    icon={Mouse}
                                    enabled={editData.placement_config?.contextMenu?.enabled || false}
                                    onEnabledChange={(enabled) => {
                                        handleEditChange('placement_config', {
                                            ...editData.placement_config,
                                            contextMenu: { ...editData.placement_config?.contextMenu, enabled }
                                        });
                                    }}
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Group</Label>
                                            <Input
                                                value={editData.placement_config?.contextMenu?.group || ''}
                                                onChange={(e) => {
                                                    handleEditChange('placement_config', {
                                                        ...editData.placement_config,
                                                        contextMenu: {
                                                            ...editData.placement_config?.contextMenu,
                                                            group: e.target.value
                                                        }
                                                    });
                                                }}
                                                placeholder="e.g., content, editing"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Priority</Label>
                                            <Input
                                                type="number"
                                                value={editData.placement_config?.contextMenu?.priority || 0}
                                                onChange={(e) => {
                                                    handleEditChange('placement_config', {
                                                        ...editData.placement_config,
                                                        contextMenu: {
                                                            ...editData.placement_config?.contextMenu,
                                                            priority: parseInt(e.target.value)
                                                        }
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </PlacementSection>

                                <PlacementSection
                                    title="Execution Card"
                                    description="Clickable card component"
                                    icon={LayoutGrid}
                                    enabled={editData.placement_config?.card?.enabled || false}
                                    onEnabledChange={(enabled) => {
                                        handleEditChange('placement_config', {
                                            ...editData.placement_config,
                                            card: { ...editData.placement_config?.card, enabled }
                                        });
                                    }}
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Mode</Label>
                                            <Select
                                                value={editData.placement_config?.card?.mode || 'one-shot'}
                                                onValueChange={(v) => {
                                                    handleEditChange('placement_config', {
                                                        ...editData.placement_config,
                                                        card: { ...editData.placement_config?.card, mode: v }
                                                    });
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="one-shot">One-Shot</SelectItem>
                                                    <SelectItem value="chat">Chat</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </PlacementSection>

                                <PlacementSection
                                    title="Button"
                                    description="Button component"
                                    icon={Menu}
                                    enabled={editData.placement_config?.button?.enabled || false}
                                    onEnabledChange={(enabled) => {
                                        handleEditChange('placement_config', {
                                            ...editData.placement_config,
                                            button: { ...editData.placement_config?.button, enabled }
                                        });
                                    }}
                                />
                            </TabsContent>

                            {/* Display Tab */}
                            <TabsContent value="display" className="space-y-4 pr-4">
                                <div className="space-y-2">
                                    <Label>Icon</Label>
                                    <Input
                                        value={editData.display_config?.icon || ''}
                                        onChange={(e) => {
                                            handleEditChange('display_config', {
                                                ...editData.display_config,
                                                icon: e.target.value
                                            });
                                        }}
                                        placeholder="Lucide icon name (e.g., Sparkles)"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={editData.display_config?.label || ''}
                                        onChange={(e) => {
                                            handleEditChange('display_config', {
                                                ...editData.display_config,
                                                label: e.target.value
                                            });
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Tooltip</Label>
                                    <Input
                                        value={editData.display_config?.tooltip || ''}
                                        onChange={(e) => {
                                            handleEditChange('display_config', {
                                                ...editData.display_config,
                                                tooltip: e.target.value
                                            });
                                        }}
                                    />
                                </div>
                            </TabsContent>

                            {/* Advanced Tab */}
                            <TabsContent value="advanced" className="space-y-4 pr-4">
                                <div className="space-y-2">
                                    <Label>System Prompt ID</Label>
                                    <Input value={editData.system_prompt_id || ''} disabled />
                                </div>

                                <div className="space-y-2">
                                    <Label>Version</Label>
                                    <Input value={editData.version || 1} disabled />
                                </div>

                                <div className="space-y-2">
                                    <Label>Required Variables</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {editData.required_variables?.map(v => (
                                            <Badge key={v} variant="secondary">{v}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label className="text-destructive">Danger Zone</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => editData.id && handleDuplicate(editData as SystemPromptDB)}
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Duplicate
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => editData.id && handleDelete(editData.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                            {hasUnsavedChanges && (
                                <span className="text-yellow-600 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    Unsaved changes
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveChanges}
                                disabled={!hasUnsavedChanges || isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Placement Section Component
interface PlacementSectionProps {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    children?: React.ReactNode;
}

function PlacementSection({
    title,
    description,
    icon: Icon,
    enabled,
    onEnabledChange,
    children
}: PlacementSectionProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle className="text-base">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </div>
                    </div>
                    <Checkbox checked={enabled} onCheckedChange={onEnabledChange} />
                </div>
            </CardHeader>
            {enabled && children && (
                <CardContent className="pt-0">
                    {children}
                </CardContent>
            )}
        </Card>
    );
}

