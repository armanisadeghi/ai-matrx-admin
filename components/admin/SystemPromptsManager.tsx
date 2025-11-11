'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Folder,
    FolderOpen,
    Search,
    Save,
    X,
    ChevronDown,
    ChevronRight,
    Settings,
    Check,
    RefreshCw,
    FileText,
    Upload
} from 'lucide-react';
import { SystemPromptDB, TriggerType, CategoryWithSubcategories } from '@/types/system-prompts-db';
import {
    fetchSystemPrompts,
    getSystemPromptById,
    updateSystemPrompt,
    deleteSystemPrompt,
    fetchSystemPromptCategories,
    checkSourceForUpdates,
    updateFromSource,
    clearSystemPromptsCache
} from '@/lib/services/system-prompts-service';
import { DiffView } from './system-prompts/DiffView';
import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';

interface SystemPromptsManagerProps {
    className?: string;
}

// Auto-resizing textarea component
const AutoResizeTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
        value?: string;
        onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        minHeight?: number;
    }
>(({ className, value, onChange, minHeight = 100, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => textareaRef.current!);

    const adjustHeight = React.useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = Math.max(minHeight, scrollHeight) + 'px';
        }
    }, [minHeight]);

    React.useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e);
        setTimeout(adjustHeight, 0);
    };

    return (
        <textarea
            ref={textareaRef}
            className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden ${className}`}
            value={value}
            onChange={handleChange}
            style={{ minHeight: minHeight + 'px' }}
            {...props}
        />
    );
});

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export function SystemPromptsManager({ className }: SystemPromptsManagerProps) {
    // State
    const [systemPrompts, setSystemPrompts] = useState<SystemPromptDB[]>([]);
    const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editData, setEditData] = useState<Partial<SystemPromptDB>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
    const [previewMode, setPreviewMode] = useState<'editor' | 'preview' | 'diff'>('editor');
    const [diffData, setDiffData] = useState<any>(null);
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [isUpdatingFromSource, setIsUpdatingFromSource] = useState(false);

    const { toast } = useToast();

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [prompts, cats] = await Promise.all([
                fetchSystemPrompts({ is_active: true }),
                fetchSystemPromptCategories()
            ]);
            setSystemPrompts(prompts);
            setCategories(cats);

            // Auto-expand first category
            if (cats.length > 0) {
                setExpandedCategories(new Set([cats[0].category_id]));
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load system prompts',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedPrompt = systemPrompts.find(p => p.id === selectedPromptId);

    useEffect(() => {
        if (selectedPrompt) {
            setEditData(selectedPrompt);
            setHasUnsavedChanges(false);
            setPreviewMode('editor');
            setDiffData(null);
        }
    }, [selectedPromptId]);

    const handleFieldChange = (field: keyof SystemPromptDB, value: any) => {
        setEditData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        if (!selectedPrompt || !editData.id) return;

        try {
            await updateSystemPrompt(editData as any);
            await loadData();
            clearSystemPromptsCache();

            toast({
                title: 'Success',
                description: 'System prompt updated successfully',
                variant: 'success'
            });

            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Error saving:', error);
            toast({
                title: 'Error',
                description: 'Failed to save system prompt',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this system prompt?')) return;

        try {
            await deleteSystemPrompt(id);
            await loadData();
            clearSystemPromptsCache();
            setSelectedPromptId(null);

            toast({
                title: 'Success',
                description: 'System prompt deleted',
                variant: 'success'
            });
        } catch (error) {
            console.error('Error deleting:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete system prompt',
                variant: 'destructive'
            });
        }
    };

    const handleCheckForUpdates = async () => {
        if (!selectedPrompt || !selectedPrompt.source_prompt_id) return;

        try {
            setIsCheckingUpdates(true);
            const diff = await checkSourceForUpdates(selectedPrompt.system_prompt_id);

            if (diff.hasChanges) {
                setDiffData(diff);
                setPreviewMode('diff');
                toast({
                    title: 'Updates Available',
                    description: 'The source prompt has been modified',
                });
            } else {
                toast({
                    title: 'No Updates',
                    description: 'Source prompt is unchanged',
                });
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
            toast({
                title: 'Error',
                description: 'Failed to check for updates',
                variant: 'destructive'
            });
        } finally {
            setIsCheckingUpdates(false);
        }
    };

    const handleUpdateFromSource = async () => {
        if (!selectedPrompt || !diffData) return;

        try {
            setIsUpdatingFromSource(true);
            await updateFromSource(selectedPrompt.system_prompt_id);
            await loadData();
            clearSystemPromptsCache();

            toast({
                title: 'Success',
                description: 'System prompt updated from source',
                variant: 'success'
            });

            setDiffData(null);
            setPreviewMode('editor');
        } catch (error) {
            console.error('Error updating from source:', error);
            toast({
                title: 'Error',
                description: 'Failed to update from source',
                variant: 'destructive'
            });
        } finally {
            setIsUpdatingFromSource(false);
        }
    };

    const toggleCategory = (catId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catId)) {
                next.delete(catId);
            } else {
                next.add(catId);
            }
            return next;
        });
    };

    const toggleSubcategory = (subcatId: string) => {
        setExpandedSubcategories(prev => {
            const next = new Set(prev);
            if (next.has(subcatId)) {
                next.delete(subcatId);
            } else {
                next.add(subcatId);
            }
            return next;
        });
    };

    // Filter prompts
    const filteredPrompts = systemPrompts.filter(prompt => {
        if (selectedCategory !== 'all' && prompt.category !== selectedCategory) return false;
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                prompt.name.toLowerCase().includes(search) ||
                prompt.system_prompt_id.toLowerCase().includes(search) ||
                (prompt.description && prompt.description.toLowerCase().includes(search))
            );
        }
        return true;
    });

    // Group prompts by category and subcategory
    const promptsByCategory = categories.map(cat => ({
        ...cat,
        prompts: filteredPrompts.filter(p => p.category === cat.category_id && !p.subcategory),
        subcategories: cat.subcategories.map(sub => ({
            ...sub,
            prompts: filteredPrompts.filter(p => p.category === cat.category_id && p.subcategory === sub.subcategory_id)
        }))
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <MatrxMiniLoader />
            </div>
        );
    }

    return (
        <div className={`flex h-full bg-background ${className}`}>
            {/* Sidebar */}
            <div className="w-80 border-r border-border flex flex-col">
                {/* Search */}
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search system prompts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Tree */}
                <ScrollArea className="flex-1">
                    <div className="p-2">
                        {promptsByCategory.map(cat => (
                            <div key={cat.category_id} className="mb-2">
                                <button
                                    onClick={() => toggleCategory(cat.category_id)}
                                    className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md text-sm font-medium"
                                >
                                    {expandedCategories.has(cat.category_id) ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                    <Folder className="h-4 w-4" />
                                    {cat.label}
                                    <Badge variant="secondary" className="ml-auto">
                                        {cat.prompts.length + cat.subcategories.reduce((sum, sub) => sum + sub.prompts.length, 0)}
                                    </Badge>
                                </button>

                                {expandedCategories.has(cat.category_id) && (
                                    <div className="ml-6 mt-1">
                                        {/* Direct prompts */}
                                        {cat.prompts.map(prompt => (
                                            <button
                                                key={prompt.id}
                                                onClick={() => setSelectedPromptId(prompt.id)}
                                                className={`flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md text-sm ${
                                                    selectedPromptId === prompt.id ? 'bg-accent' : ''
                                                }`}
                                            >
                                                <FileText className="h-3 w-3" />
                                                <span className="flex-1 text-left truncate">{prompt.name}</span>
                                                {!prompt.is_active && <EyeOff className="h-3 w-3" />}
                                            </button>
                                        ))}

                                        {/* Subcategories */}
                                        {cat.subcategories.map(sub => sub.prompts.length > 0 && (
                                            <div key={sub.subcategory_id} className="mt-1">
                                                <button
                                                    onClick={() => toggleSubcategory(sub.subcategory_id)}
                                                    className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md text-xs"
                                                >
                                                    {expandedSubcategories.has(sub.subcategory_id) ? (
                                                        <ChevronDown className="h-3 w-3" />
                                                    ) : (
                                                        <ChevronRight className="h-3 w-3" />
                                                    )}
                                                    <FolderOpen className="h-3 w-3" />
                                                    {sub.label}
                                                    <Badge variant="outline" className="ml-auto text-xs">
                                                        {sub.prompts.length}
                                                    </Badge>
                                                </button>

                                                {expandedSubcategories.has(sub.subcategory_id) && (
                                                    <div className="ml-6 mt-1">
                                                        {sub.prompts.map(prompt => (
                                                            <button
                                                                key={prompt.id}
                                                                onClick={() => setSelectedPromptId(prompt.id)}
                                                                className={`flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md text-xs ${
                                                                    selectedPromptId === prompt.id ? 'bg-accent' : ''
                                                                }`}
                                                            >
                                                                <FileText className="h-3 w-3" />
                                                                <span className="flex-1 text-left truncate">{prompt.name}</span>
                                                                {!prompt.is_active && <EyeOff className="h-3 w-3" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Editor Panel */}
            <div className="flex-1 flex flex-col">
                {!selectedPrompt ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a system prompt to edit
                    </div>
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold">{selectedPrompt.name}</h2>
                                {hasUnsavedChanges && (
                                    <Badge variant="outline" className="bg-orange-100 dark:bg-orange-950">
                                        Unsaved
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {selectedPrompt.source_prompt_id && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCheckForUpdates}
                                        disabled={isCheckingUpdates}
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                                        Check Updates
                                    </Button>
                                )}

                                <div className="flex items-center gap-1 border border-border rounded-md">
                                    <Button
                                        variant={previewMode === 'editor' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setPreviewMode('editor')}
                                        className="h-8"
                                    >
                                        Editor
                                    </Button>
                                    <Button
                                        variant={previewMode === 'preview' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setPreviewMode('preview')}
                                        className="h-8"
                                    >
                                        Preview
                                    </Button>
                                    {diffData && (
                                        <Button
                                            variant={previewMode === 'diff' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            onClick={() => setPreviewMode('diff')}
                                            className="h-8"
                                        >
                                            Diff
                                        </Button>
                                    )}
                                </div>

                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={!hasUnsavedChanges}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                </Button>

                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(selectedPrompt.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-1 p-4">
                            {previewMode === 'diff' && diffData ? (
                                <div>
                                    <DiffView
                                        oldPrompt={selectedPrompt}
                                        newPrompt={diffData.newPrompt}
                                    />
                                    <div className="mt-4 flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setPreviewMode('editor')}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="default"
                                            onClick={handleUpdateFromSource}
                                            disabled={isUpdatingFromSource}
                                        >
                                            {isUpdatingFromSource ? 'Updating...' : 'Apply Update'}
                                        </Button>
                                    </div>
                                </div>
                            ) : previewMode === 'preview' ? (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold mb-2">Messages</h3>
                                        {editData.messages?.map((msg, idx) => (
                                            <Card key={idx} className="mb-2">
                                                <CardContent className="p-4">
                                                    <Badge className="mb-2">{msg.role}</Badge>
                                                    <EnhancedChatMarkdown content={msg.content} />
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Name</Label>
                                            <Input
                                                value={editData.name || ''}
                                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>System Prompt ID</Label>
                                            <Input
                                                value={editData.system_prompt_id || ''}
                                                onChange={(e) => handleFieldChange('system_prompt_id', e.target.value)}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Description</Label>
                                        <AutoResizeTextarea
                                            value={editData.description || ''}
                                            onChange={(e) => handleFieldChange('description', e.target.value)}
                                            minHeight={60}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label>Icon Name</Label>
                                            <Input
                                                value={editData.icon_name || ''}
                                                onChange={(e) => handleFieldChange('icon_name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Category</Label>
                                            <Select
                                                value={editData.category || ''}
                                                onValueChange={(value) => handleFieldChange('category', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map(cat => (
                                                        <SelectItem key={cat.category_id} value={cat.category_id}>
                                                            {cat.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Active</Label>
                                            <div className="flex items-center h-10">
                                                <Checkbox
                                                    checked={editData.is_active || false}
                                                    onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Triggers */}
                                    <div>
                                        <Label>Enabled Triggers</Label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {(['context-menu', 'button', 'card', 'modal'] as TriggerType[]).map(trigger => (
                                                <Badge
                                                    key={trigger}
                                                    variant={editData.enabled_triggers?.includes(trigger) ? 'default' : 'outline'}
                                                    className="cursor-pointer"
                                                    onClick={() => {
                                                        const current = editData.enabled_triggers || [];
                                                        const next = current.includes(trigger)
                                                            ? current.filter(t => t !== trigger)
                                                            : [...current, trigger];
                                                        handleFieldChange('enabled_triggers', next);
                                                    }}
                                                >
                                                    {trigger}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div>
                                        <Label>Messages</Label>
                                        {editData.messages?.map((msg, idx) => (
                                            <Card key={idx} className="mb-2">
                                                <CardContent className="p-4 space-y-2">
                                                    <Select
                                                        value={msg.role}
                                                        onValueChange={(role) => {
                                                            const messages = [...(editData.messages || [])];
                                                            messages[idx] = { ...messages[idx], role };
                                                            handleFieldChange('messages', messages);
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-32">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="system">System</SelectItem>
                                                            <SelectItem value="user">User</SelectItem>
                                                            <SelectItem value="assistant">Assistant</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <AutoResizeTextarea
                                                        value={msg.content}
                                                        onChange={(e) => {
                                                            const messages = [...(editData.messages || [])];
                                                            messages[idx] = { ...messages[idx], content: e.target.value };
                                                            handleFieldChange('messages', messages);
                                                        }}
                                                    />
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </ScrollArea>
                    </>
                )}
            </div>
        </div>
    );
}
