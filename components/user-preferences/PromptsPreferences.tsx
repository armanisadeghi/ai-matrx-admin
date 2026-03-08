'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RootState } from "@/lib/redux/store";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setPreference, ThinkingMode } from '@/lib/redux/slices/userPreferencesSlice';
import { supabase } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

type AIModel = { id: string; name: string; common_name: string | null; model_class: string; provider: string | null; is_deprecated: boolean; };

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const PromptsPreferences = () => {
    const dispatch = useAppDispatch();
    const prompts = useSelector((state: RootState) => state.userPreferences.prompts);
    const aiModels = useSelector((state: RootState) => state.userPreferences.aiModels);
    const [activeModels, setActiveModels] = useState<AIModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { data: models } = await supabase
                    .from('ai_model').select('*').eq('is_deprecated', false).order('common_name', { ascending: true });
                setActiveModels(models?.filter(m => aiModels.activeModels.includes(m.id)) || []);
            } finally { setIsLoadingModels(false); }
        };
        load();
    }, [aiModels.activeModels]);

    const handleSwitch = (preference: keyof typeof prompts) => (checked: boolean) =>
        dispatch(setPreference({ module: 'prompts', preference, value: checked }));
    const handleSelect = (preference: keyof typeof prompts) => (value: string) =>
        dispatch(setPreference({ module: 'prompts', preference, value }));
    const handleTemperature = (value: number[]) =>
        dispatch(setPreference({ module: 'prompts', preference: 'defaultTemperature', value: value[0] }));

    return (
        <div>
            <div className={row}>
                <Label htmlFor="showSettingsOnMainPage" className={rowLabel}>Settings on Main Page</Label>
                <Switch id="showSettingsOnMainPage" checked={prompts.showSettingsOnMainPage} onCheckedChange={handleSwitch('showSettingsOnMainPage')} />
            </div>

            <div className={row}>
                <Label htmlFor="defaultModel" className={rowLabel}>Default Model</Label>
                {isLoadingModels ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : activeModels.length === 0 ? (
                    <span className="text-xs text-amber-500">No active models</span>
                ) : (
                    <Select value={prompts.defaultModel} onValueChange={handleSelect('defaultModel')}>
                        <SelectTrigger id="defaultModel" className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {activeModels.map(model => (
                                <SelectItem key={model.id} value={model.id}>{model.common_name || model.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            <div className="px-4 py-3.5 border-b border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                    <Label className={rowLabel}>Temperature</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{prompts.defaultTemperature.toFixed(2)}</span>
                </div>
                <Slider min={0} max={2} step={0.01} value={[prompts.defaultTemperature]} onValueChange={handleTemperature} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.00 Deterministic</span>
                    <span className="hidden sm:inline">1.00 Balanced</span>
                    <span>2.00 Creative</span>
                </div>
            </div>

            <div className={row}>
                <Label htmlFor="includeThinkingInAutoPrompts" className={rowLabel}>Thinking Mode</Label>
                <Select value={prompts.includeThinkingInAutoPrompts} onValueChange={(v) => handleSelect('includeThinkingInAutoPrompts')(v as ThinkingMode)}>
                    <SelectTrigger id="includeThinkingInAutoPrompts" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="deep">Deep</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className={row}>
                <Label htmlFor="alwaysIncludeInternalWebSearch" className={rowLabel}>Always Web Search</Label>
                <Switch id="alwaysIncludeInternalWebSearch" checked={prompts.alwaysIncludeInternalWebSearch} onCheckedChange={handleSwitch('alwaysIncludeInternalWebSearch')} />
            </div>

            <div className={row}>
                <Label htmlFor="submitOnEnter" className={rowLabel}>Submit on Enter</Label>
                <Switch id="submitOnEnter" checked={prompts.submitOnEnter} onCheckedChange={handleSwitch('submitOnEnter')} />
            </div>

            <div className={row}>
                <Label htmlFor="autoClearResponsesInEditMode" className={rowLabel}>Auto Clear in Edit Mode</Label>
                <Switch id="autoClearResponsesInEditMode" checked={prompts.autoClearResponsesInEditMode} onCheckedChange={handleSwitch('autoClearResponsesInEditMode')} />
            </div>
        </div>
    );
};

export default PromptsPreferences;
