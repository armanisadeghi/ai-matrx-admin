'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import type { AiModelFormData, AiProvider, AiModelRow } from '../types';

interface AiModelFormProps {
    data: AiModelFormData;
    providers: AiProvider[];
    allModels: AiModelRow[];
    isNew: boolean;
    saving: boolean;
    isDirty?: boolean;
    onChange: (data: AiModelFormData) => void;
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
    allModels,
    isNew,
    saving,
    isDirty = true,
    onChange,
    onDelete,
}: AiModelFormProps) {
    // "Same as name" — true when model_class equals name
    const [modelClassSameAsName, setModelClassSameAsName] = useState(
        () => !data.model_class || data.model_class === data.name
    );
    // Whether the user is entering a custom free-text value (vs picking from dropdown)
    const [modelClassCustom, setModelClassCustom] = useState(false);

    // Keep model_class in sync when "same as name" is on
    useEffect(() => {
        if (modelClassSameAsName) {
            onChange({ ...data, model_class: data.name });
        }
        // Only re-run when the name changes while the checkbox is on
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.name, modelClassSameAsName]);

    const set = (key: keyof AiModelFormData) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => onChange({ ...data, [key]: e.target.value });

    const toggle = (key: keyof AiModelFormData) => (checked: boolean) =>
        onChange({ ...data, [key]: checked });

    const handleSameAsNameToggle = (checked: boolean) => {
        setModelClassSameAsName(checked);
        if (checked) {
            setModelClassCustom(false);
            onChange({ ...data, model_class: data.name });
        }
    };

    const handleModelClassSelectChange = (value: string) => {
        if (value === '__custom__') {
            setModelClassCustom(true);
            // don't clear model_class — let user type
        } else {
            setModelClassCustom(false);
            onChange({ ...data, model_class: value });
        }
    };

    // Sorted unique model names for the dropdown (excluding current model to avoid self-ref noise)
    const modelNameOptions = React.useMemo(() => {
        const names = allModels.map((m) => m.name).filter(Boolean) as string[];
        return [...new Set(names)].sort();
    }, [allModels]);

    return (
        <div className="space-y-3">
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

            {/* Model Class with "Same as name" toggle */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Model Class <span className="text-destructive ml-1">*</span>
                        </Label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <Checkbox
                                checked={modelClassSameAsName}
                                onCheckedChange={(v) => handleSameAsNameToggle(!!v)}
                                id="model_class_same"
                                className="h-3.5 w-3.5"
                            />
                            <span className="text-xs text-muted-foreground">Same as name</span>
                        </label>
                    </div>

                    {modelClassSameAsName ? (
                        <Input
                            value={data.model_class}
                            readOnly
                            className="h-8 text-sm font-mono bg-muted/50 cursor-not-allowed"
                        />
                    ) : modelClassCustom ? (
                        <div className="flex gap-1">
                            <Input
                                value={data.model_class}
                                onChange={set('model_class')}
                                placeholder="Enter model class…"
                                className="h-8 text-sm font-mono flex-1"
                                autoFocus
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs shrink-0"
                                onClick={() => setModelClassCustom(false)}
                            >
                                List
                            </Button>
                        </div>
                    ) : (
                        <Select
                            value={modelNameOptions.includes(data.model_class) ? data.model_class : (data.model_class ? '__custom__' : undefined)}
                            onValueChange={handleModelClassSelectChange}
                        >
                            <SelectTrigger className="h-8 text-sm font-mono">
                                <SelectValue placeholder="Choose model name or custom…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__custom__" className="font-normal text-muted-foreground italic">
                                    — Custom value —
                                </SelectItem>
                                {modelNameOptions.map((n) => (
                                    <SelectItem key={n} value={n} className="font-mono text-xs">
                                        {n}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <p className="text-xs text-muted-foreground">The API model identifier</p>
                </div>

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
                        value={data.model_provider || undefined}
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

            {/* Delete — only in edit mode */}
            {!isNew && onDelete && (
                <div className="pt-1">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Model
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
                </div>
            )}
        </div>
    );
}
