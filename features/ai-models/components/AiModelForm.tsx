'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Save, X } from 'lucide-react';
import type { AiModelFormData, AiProvider } from '../types';

interface AiModelFormProps {
    data: AiModelFormData;
    providers: AiProvider[];
    isNew: boolean;
    saving: boolean;
    onChange: (data: AiModelFormData) => void;
    onSave: () => Promise<void>;
    onCancel: () => void;
    onDelete?: () => Promise<void>;
}

function FormField({
    label,
    children,
    required,
    description,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
    description?: string;
}) {
    return (
        <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {children}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
    );
}

export default function AiModelForm({
    data,
    providers,
    isNew,
    saving,
    onChange,
    onSave,
    onCancel,
    onDelete,
}: AiModelFormProps) {
    const set = (key: keyof AiModelFormData) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => onChange({ ...data, [key]: e.target.value });

    const toggle = (key: keyof AiModelFormData) => (checked: boolean) =>
        onChange({ ...data, [key]: checked });

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Name" required>
                        <Input
                            value={data.name}
                            onChange={set('name')}
                            placeholder="e.g. claude-sonnet-4-6"
                            className="h-8 text-sm font-mono"
                        />
                    </FormField>
                    <FormField label="Common Name">
                        <Input
                            value={data.common_name}
                            onChange={set('common_name')}
                            placeholder="e.g. Claude Sonnet 4.6"
                            className="h-8 text-sm"
                        />
                    </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Model Class" required description="The API model identifier">
                        <Input
                            value={data.model_class}
                            onChange={set('model_class')}
                            placeholder="e.g. claude-sonnet-4-6"
                            className="h-8 text-sm font-mono"
                        />
                    </FormField>
                    <FormField label="API Class" description="Internal routing class">
                        <Input
                            value={data.api_class}
                            onChange={set('api_class')}
                            placeholder="e.g. anthropic_adaptive"
                            className="h-8 text-sm font-mono"
                        />
                    </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Provider" description="Provider name string (e.g. Anthropic)">
                        <Input
                            value={data.provider}
                            onChange={set('provider')}
                            placeholder="e.g. Anthropic"
                            className="h-8 text-sm"
                        />
                    </FormField>
                    <FormField label="Provider Record" description="FK to ai_provider table">
                        <Select
                            value={data.model_provider || ''}
                            onValueChange={(v) => onChange({ ...data, model_provider: v === '__none__' ? '' : v })}
                        >
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select provider..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">— none —</SelectItem>
                                {providers.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name ?? p.id}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Context Window" description="Total tokens (input + output)">
                        <Input
                            type="number"
                            value={data.context_window}
                            onChange={set('context_window')}
                            placeholder="e.g. 200000"
                            className="h-8 text-sm"
                        />
                    </FormField>
                    <FormField label="Max Tokens" description="Maximum output tokens">
                        <Input
                            type="number"
                            value={data.max_tokens}
                            onChange={set('max_tokens')}
                            placeholder="e.g. 64000"
                            className="h-8 text-sm"
                        />
                    </FormField>
                </div>

                <div className="border rounded-md p-3 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Flags</p>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={!!data.is_deprecated}
                                onCheckedChange={toggle('is_deprecated')}
                                id="is_deprecated"
                            />
                            <Label htmlFor="is_deprecated" className="text-sm cursor-pointer">
                                Deprecated
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={!!data.is_primary}
                                onCheckedChange={toggle('is_primary')}
                                id="is_primary"
                            />
                            <Label htmlFor="is_primary" className="text-sm cursor-pointer">
                                Primary
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={!!data.is_premium}
                                onCheckedChange={toggle('is_premium')}
                                id="is_premium"
                            />
                            <Label htmlFor="is_premium" className="text-sm cursor-pointer">
                                Premium
                            </Label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t px-3 py-2 flex items-center justify-between gap-2 bg-card shrink-0">
                <div>
                    {!isNew && onDelete && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete AI Model?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete <strong>{data.common_name || data.name}</strong>. 
                                        Any prompts or builtins using this model will lose their model reference. 
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={onDelete}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Delete Model
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs gap-1"
                        onClick={onCancel}
                    >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        className="h-8 px-3 text-xs gap-1"
                        onClick={onSave}
                        disabled={saving || !data.name.trim() || !data.model_class.trim()}
                    >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? 'Saving...' : isNew ? 'Create Model' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
