'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle2 } from 'lucide-react';
import AiModelForm from './AiModelForm';
import JsonFieldEditor from './JsonFieldEditor';
import ControlsEditor from './ControlsEditor';
import ModelUsageAudit from './ModelUsageAudit';
import { aiModelService } from '../service';
import ModelPricingEditor from '@/features/ai-models/components/ModelPricingEditor';
import type { AiModelRow, AiModelFormData, AiProvider, ControlsSchema, PricingTier } from '../types';

interface AiModelDetailPanelProps {
    model: AiModelRow | null;
    isNew: boolean;
    providers: AiProvider[];
    allModels: AiModelRow[];
    onClose: () => void;
    onSaved: (model: AiModelRow) => void;
    onDeleted: (id: string) => void;
}

function rowToFormData(row: AiModelRow): AiModelFormData {
    return {
        name: row.name ?? '',
        common_name: row.common_name ?? '',
        model_class: row.model_class ?? '',
        provider: row.provider ?? '',
        api_class: row.api_class ?? '',
        context_window: row.context_window != null ? String(row.context_window) : '',
        max_tokens: row.max_tokens != null ? String(row.max_tokens) : '',
        model_provider: row.model_provider ?? '',
        is_deprecated: row.is_deprecated ?? false,
        is_primary: row.is_primary ?? false,
        is_premium: row.is_premium ?? false,
        pricing: row.pricing ?? [],
    };
}

const EMPTY_FORM: AiModelFormData = {
    name: '',
    common_name: '',
    model_class: '',
    provider: '',
    api_class: '',
    context_window: '',
    max_tokens: '',
    model_provider: '',
    is_deprecated: false,
    is_primary: false,
    is_premium: false,
    pricing: [],
};

export default function AiModelDetailPanel({
    model,
    isNew,
    providers,
    allModels,
    onClose,
    onSaved,
    onDeleted,
}: AiModelDetailPanelProps) {
    const [formData, setFormData] = useState<AiModelFormData>(
        isNew ? EMPTY_FORM : model ? rowToFormData(model) : EMPTY_FORM
    );
    // Baseline is what was last saved/loaded — used to compute dirty state
    const [baseline, setBaseline] = useState<AiModelFormData>(
        isNew ? EMPTY_FORM : model ? rowToFormData(model) : EMPTY_FORM
    );
    const [saving, setSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [activeTab, setActiveTab] = useState('details');

    // Key-stable dirty check — JSON.stringify is order-sensitive, so compare field-by-field
    const isDirty = (Object.keys({ ...formData, ...baseline }) as Array<keyof AiModelFormData>).some(
        (k) => JSON.stringify(formData[k]) !== JSON.stringify(baseline[k])
    );

    useEffect(() => {
        const base = isNew ? EMPTY_FORM : model ? rowToFormData(model) : EMPTY_FORM;
        setFormData(base);
        setBaseline(base);
        setSavedFlash(false);
        setActiveTab('details');
    }, [model?.id, isNew]);

    // Clean up flash timer on unmount
    useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

    const displayName = isNew
        ? 'New Model'
        : (model?.common_name || model?.name || 'Model');

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                common_name: formData.common_name.trim() || null,
                model_class: formData.model_class.trim(),
                provider: formData.provider.trim() || null,
                api_class: formData.api_class.trim() || null,
                context_window: formData.context_window ? parseInt(formData.context_window) : null,
                max_tokens: formData.max_tokens ? parseInt(formData.max_tokens) : null,
                model_provider: formData.model_provider || null,
                is_deprecated: formData.is_deprecated,
                is_primary: formData.is_primary,
                is_premium: formData.is_premium,
                pricing: formData.pricing.length > 0 ? formData.pricing : null,
                endpoints: model?.endpoints ?? null,
                capabilities: model?.capabilities ?? null,
                controls: model?.controls ?? null,
            };

            let saved: AiModelRow;
            if (isNew) {
                saved = await aiModelService.create(payload);
            } else if (model) {
                saved = await aiModelService.update(model.id, payload);
            } else {
                return;
            }
            // Update baseline so dirty clears, show brief "Saved" flash
            const newBase = rowToFormData(saved);
            setBaseline(newBase);
            setFormData(newBase);
            setSavedFlash(true);
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
            savedTimerRef.current = setTimeout(() => setSavedFlash(false), 2500);
            onSaved(saved);
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!model) return;
        try {
            await aiModelService.remove(model.id);
            onDeleted(model.id);
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const handleJsonSave = (field: 'endpoints' | 'capabilities' | 'controls') =>
        async (data: object) => {
            if (!model) return;
            const updated = await aiModelService.update(model.id, { [field]: data });
            onSaved(updated);
        };

    const handleControlsSave = async (controls: ControlsSchema) => {
        if (!model) return;
        const updated = await aiModelService.update(model.id, { controls });
        onSaved(updated);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-card">
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold truncate">{displayName}</span>
                    {isNew && (
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 shrink-0">
                            New
                        </Badge>
                    )}
                    {!isNew && model?.is_deprecated && (
                        <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 shrink-0">
                            Deprecated
                        </Badge>
                    )}
                    {!isNew && model?.is_primary && (
                        <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 shrink-0">
                            Primary
                        </Badge>
                    )}
                    {/* Dirty indicator */}
                    {isDirty && !saving && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Unsaved changes" />
                    )}
                    {/* Saved flash */}
                    {savedFlash && !isDirty && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Saved
                        </span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {isNew ? (
                <div className="flex-1 overflow-hidden">
                    <AiModelForm
                        data={formData}
                        providers={providers}
                        isNew
                        saving={saving}
                        isDirty={isDirty}
                        onChange={setFormData}
                        onSave={handleSave}
                        onCancel={onClose}
                    />
                </div>
            ) : (
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 flex flex-col overflow-hidden"
                >
                    <div className="border-b px-3 shrink-0">
                        <TabsList className="h-9 bg-transparent p-0 gap-0">
                            <TabsTrigger
                                value="details"
                                className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
                            >
                                Details
                                {isDirty && (
                                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="json"
                                className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
                            >
                                JSON Fields
                            </TabsTrigger>
                            <TabsTrigger
                                value="controls"
                                className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
                            >
                                Controls
                                {model?.controls && (
                                    <Badge variant="outline" className="ml-1.5 text-xs h-4 px-1">
                                        {Object.keys(model.controls as object).length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="pricing"
                                className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
                            >
                                Pricing
                                {formData.pricing.length > 0 && (
                                    <Badge variant="outline" className="ml-1.5 text-xs h-4 px-1">
                                        {formData.pricing.length}
                                    </Badge>
                                )}
                                {isDirty && activeTab === 'pricing' && (
                                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="usage"
                                className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
                            >
                                Usage
                                {model?.is_deprecated && (
                                    <span className="ml-1 w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="details" className="flex-1 m-0 overflow-hidden">
                        <AiModelForm
                            data={formData}
                            providers={providers}
                            isNew={false}
                            saving={saving}
                            isDirty={isDirty}
                            onChange={setFormData}
                            onSave={handleSave}
                            onCancel={onClose}
                            onDelete={handleDelete}
                        />
                    </TabsContent>

                    <TabsContent value="json" className="flex-1 m-0 overflow-auto p-3 space-y-3">
                        <JsonFieldEditor
                            title="Endpoints"
                            data={model?.endpoints}
                            onSave={handleJsonSave('endpoints')}
                            description="Array of endpoint identifiers"
                            defaultExpanded
                        />
                        <JsonFieldEditor
                            title="Capabilities"
                            data={model?.capabilities}
                            onSave={handleJsonSave('capabilities')}
                            description="Supported features (array or object)"
                        />
                    </TabsContent>

                    <TabsContent value="controls" className="flex-1 m-0 overflow-auto p-3">
                        <ControlsEditor
                            controls={model?.controls as ControlsSchema ?? null}
                            onSave={handleControlsSave}
                        />
                    </TabsContent>

                    <TabsContent value="pricing" className="flex-1 m-0 overflow-auto p-3">
                        <ModelPricingEditor
                            tiers={formData.pricing}
                            onChange={(tiers: PricingTier[]) => setFormData({ ...formData, pricing: tiers })}
                            onSave={async (tiers: PricingTier[]) => {
                                if (!model) return;
                                const updated = await aiModelService.update(model.id, {
                                    pricing: tiers.length > 0 ? tiers : null,
                                });
                                const newBase = rowToFormData(updated);
                                setBaseline(newBase);
                                setFormData(newBase);
                                setSavedFlash(true);
                                if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
                                savedTimerRef.current = setTimeout(() => setSavedFlash(false), 2500);
                                onSaved(updated);
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="usage" className="flex-1 m-0 overflow-hidden">
                        {model && (
                            <ModelUsageAudit
                                model={model}
                                allModels={allModels}
                                onReplaceDone={() => {}}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
