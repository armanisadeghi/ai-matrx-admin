'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles, AlertCircle } from 'lucide-react';
import {
    generateSystemPromptId,
    publishPromptAsSystem,
    fetchSystemPromptCategories,
    getSystemPromptBySystemId
} from '@/lib/services/system-prompts-service';
import { TriggerType, VariableSchema } from '@/types/system-prompts-db';
import { PromptsData } from '@/features/prompts/types/core';

interface PublishSystemPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    prompt: PromptsData;
    onSuccess?: () => void;
}

// Auto-resizing textarea component
const AutoResizeTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
        value?: string;
        onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        minHeight?: number;
    }
>(({ className, value, onChange, minHeight = 80, ...props }, ref) => {
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

export function PublishSystemPromptModal({
    isOpen,
    onClose,
    prompt,
    onSuccess
}: PublishSystemPromptModalProps) {
    const [systemPromptId, setSystemPromptId] = useState('');
    const [category, setCategory] = useState('general');
    const [subcategory, setSubcategory] = useState('');
    const [iconName, setIconName] = useState('Sparkles');
    const [enabledTriggers, setEnabledTriggers] = useState<TriggerType[]>(['context-menu']);
    const [contextMenuLabel, setContextMenuLabel] = useState('');
    const [contextMenuSubmenu, setContextMenuSubmenu] = useState('');
    const [cardAllowChat, setCardAllowChat] = useState(true);
    const [cardAutoClose, setCardAutoClose] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [existingPromptWarning, setExistingPromptWarning] = useState('');
    const { toast } = useToast();

    // Load categories
    useEffect(() => {
        if (isOpen) {
            loadCategories();
            resetForm();
        }
    }, [isOpen]);

    const loadCategories = async () => {
        try {
            setIsLoading(true);
            const cats = await fetchSystemPromptCategories();
            setCategories(cats);
        } catch (error) {
            console.error('Error loading categories:', error);
            toast({
                title: 'Error',
                description: 'Failed to load categories',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        const autoId = generateSystemPromptId(prompt.name || 'new-prompt');
        setSystemPromptId(autoId);
        setCategory('general');
        setSubcategory('');
        setIconName('Sparkles');
        setEnabledTriggers(['context-menu']);
        setContextMenuLabel(prompt.name || '');
        setContextMenuSubmenu('');
        setCardAllowChat(true);
        setCardAutoClose(false);
        setExistingPromptWarning('');
        checkExistingPrompt(autoId);
    };

    // Auto-generate system_prompt_id from name
    useEffect(() => {
        if (prompt.name) {
            const autoId = generateSystemPromptId(prompt.name);
            setSystemPromptId(autoId);
            checkExistingPrompt(autoId);
        }
    }, [prompt.name]);

    const checkExistingPrompt = async (id: string) => {
        if (!id) return;

        try {
            const existing = await getSystemPromptBySystemId(id);
            if (existing) {
                setExistingPromptWarning(`A system prompt with ID "${id}" already exists. Publishing will replace it.`);
            } else {
                setExistingPromptWarning('');
            }
        } catch (error) {
            // Not found is fine
            setExistingPromptWarning('');
        }
    };

    // Extract variables from prompt messages
    const extractedVariables = React.useMemo(() => {
        const varSet = new Set<string>();
        prompt.messages?.forEach(msg => {
            const matches = msg.content.match(/\{\{(\w+)\}\}/g);
            matches?.forEach(match => {
                const varName = match.replace(/\{\{|\}\}/g, '');
                varSet.add(varName);
            });
        });
        return Array.from(varSet);
    }, [prompt.messages]);

    const handleToggleTrigger = (trigger: TriggerType) => {
        if (enabledTriggers.includes(trigger)) {
            setEnabledTriggers(enabledTriggers.filter(t => t !== trigger));
        } else {
            setEnabledTriggers([...enabledTriggers, trigger]);
        }
    };

    const handlePublish = async () => {
        if (!systemPromptId.trim()) {
            toast({
                title: 'Validation Error',
                description: 'System Prompt ID is required',
                variant: 'destructive'
            });
            return;
        }

        if (!category) {
            toast({
                title: 'Validation Error',
                description: 'Category is required',
                variant: 'destructive'
            });
            return;
        }

        if (enabledTriggers.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'At least one trigger must be enabled',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsSaving(true);

            // Build variable schema
            const variableSchema: VariableSchema = {};
            extractedVariables.forEach(varName => {
                variableSchema[varName] = {
                    type: 'string',
                    description: `Variable: ${varName}`,
                    required: true
                };
            });

            // Build trigger config
            const triggerConfig: any = {};
            if (enabledTriggers.includes('context-menu')) {
                triggerConfig['context-menu'] = {
                    menu_label: contextMenuLabel || prompt.name,
                    submenu: contextMenuSubmenu || undefined,
                    description: prompt.description || undefined
                };
            }
            if (enabledTriggers.includes('card')) {
                triggerConfig['card'] = {
                    allow_chat: cardAllowChat,
                    auto_close: cardAutoClose,
                    show_copy: true
                };
            }

            await publishPromptAsSystem({
                source_prompt_id: prompt.id!,
                system_prompt_id: systemPromptId.trim(),
                category,
                subcategory: subcategory || undefined,
                icon_name: iconName,
                enabled_triggers: enabledTriggers,
                trigger_config: triggerConfig,
                variable_schema: variableSchema
            });

            toast({
                title: 'Success',
                description: 'Prompt published as system prompt successfully',
                variant: 'success'
            });

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error publishing system prompt:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to publish system prompt',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const selectedCategory = categories.find(c => c.category_id === category);
    const availableSubcategories = selectedCategory?.subcategories || [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Publish as System Prompt
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 py-2">
                        {/* Warning if existing */}
                        {existingPromptWarning && (
                            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                                <CardContent className="pt-4 pb-3">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                        <p className="text-sm text-amber-800 dark:text-amber-200">
                                            {existingPromptWarning}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Basic Info */}
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="system-prompt-id">System Prompt ID</Label>
                                <Input
                                    id="system-prompt-id"
                                    value={systemPromptId}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                                        setSystemPromptId(val);
                                        checkExistingPrompt(val);
                                    }}
                                    placeholder="analyze-text-detail"
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Unique identifier (lowercase, hyphens only)
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="icon-name">Icon Name</Label>
                                <Input
                                    id="icon-name"
                                    value={iconName}
                                    onChange={(e) => setIconName(e.target.value)}
                                    placeholder="Sparkles"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Lucide icon name (e.g., Sparkles, FileText, Zap)
                                </p>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="category">Category *</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General</SelectItem>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.category_id} value={cat.category_id}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="subcategory">Subcategory</Label>
                                <Select value={subcategory} onValueChange={setSubcategory}>
                                    <SelectTrigger id="subcategory">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {availableSubcategories.map((subcat: any) => (
                                            <SelectItem key={subcat.subcategory_id} value={subcat.subcategory_id}>
                                                {subcat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Variables Preview */}
                        {extractedVariables.length > 0 && (
                            <div>
                                <Label>Detected Variables</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {extractedVariables.map(varName => (
                                        <Badge key={varName} variant="secondary">
                                            {varName}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trigger Configuration */}
                        <div className="space-y-3">
                            <Label>Enabled Triggers *</Label>

                            {/* Context Menu */}
                            <Card className={enabledTriggers.includes('context-menu') ? 'border-blue-500' : ''}>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="trigger-context-menu"
                                            checked={enabledTriggers.includes('context-menu')}
                                            onCheckedChange={() => handleToggleTrigger('context-menu')}
                                        />
                                        <Label htmlFor="trigger-context-menu" className="font-semibold cursor-pointer">
                                            Context Menu
                                        </Label>
                                    </div>
                                    {enabledTriggers.includes('context-menu') && (
                                        <div className="space-y-2 ml-6">
                                            <div>
                                                <Label htmlFor="context-menu-label" className="text-xs">Menu Label</Label>
                                                <Input
                                                    id="context-menu-label"
                                                    value={contextMenuLabel}
                                                    onChange={(e) => setContextMenuLabel(e.target.value)}
                                                    placeholder="Analyze Text"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="context-menu-submenu" className="text-xs">Submenu (optional)</Label>
                                                <Input
                                                    id="context-menu-submenu"
                                                    value={contextMenuSubmenu}
                                                    onChange={(e) => setContextMenuSubmenu(e.target.value)}
                                                    placeholder="Analysis"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Card */}
                            <Card className={enabledTriggers.includes('card') ? 'border-blue-500' : ''}>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="trigger-card"
                                            checked={enabledTriggers.includes('card')}
                                            onCheckedChange={() => handleToggleTrigger('card')}
                                        />
                                        <Label htmlFor="trigger-card" className="font-semibold cursor-pointer">
                                            Card Component
                                        </Label>
                                    </div>
                                    {enabledTriggers.includes('card') && (
                                        <div className="space-y-2 ml-6">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="card-allow-chat"
                                                    checked={cardAllowChat}
                                                    onCheckedChange={(checked) => setCardAllowChat(checked as boolean)}
                                                />
                                                <Label htmlFor="card-allow-chat" className="text-xs cursor-pointer">
                                                    Allow continued conversation
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="card-auto-close"
                                                    checked={cardAutoClose}
                                                    onCheckedChange={(checked) => setCardAutoClose(checked as boolean)}
                                                />
                                                <Label htmlFor="card-auto-close" className="text-xs cursor-pointer">
                                                    Auto-close after response
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Button */}
                            <Card className={enabledTriggers.includes('button') ? 'border-blue-500' : ''}>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="trigger-button"
                                            checked={enabledTriggers.includes('button')}
                                            onCheckedChange={() => handleToggleTrigger('button')}
                                        />
                                        <Label htmlFor="trigger-button" className="font-semibold cursor-pointer">
                                            Button Trigger
                                        </Label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Modal */}
                            <Card className={enabledTriggers.includes('modal') ? 'border-blue-500' : ''}>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="trigger-modal"
                                            checked={enabledTriggers.includes('modal')}
                                            onCheckedChange={() => handleToggleTrigger('modal')}
                                        />
                                        <Label htmlFor="trigger-modal" className="font-semibold cursor-pointer">
                                            Modal Trigger
                                        </Label>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handlePublish} disabled={isSaving || isLoading}>
                        {isSaving ? 'Publishing...' : 'Publish System Prompt'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
