'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { RootState, useAppDispatch } from '@/lib/redux';
import { setPreference, ThinkingMode } from '@/lib/redux/slices/userPreferencesSlice';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

type AIModel = {
    id: string;
    name: string;
    common_name: string | null;
    model_class: string;
    provider: string | null;
    is_deprecated: boolean;
};


const PromptsPreferences = () => {
    const dispatch = useAppDispatch();
    const prompts = useSelector((state: RootState) => state.userPreferences.prompts);
    const aiModels = useSelector((state: RootState) => state.userPreferences.aiModels);
    const [activeModels, setActiveModels] = useState<AIModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);

    useEffect(() => {
        const loadActiveModels = async () => {
            try {
                setIsLoadingModels(true);
                const supabase = createClient();
                const { data: models, error } = await supabase
                    .from('ai_model')
                    .select('*')
                    .eq('is_deprecated', false)
                    .order('common_name', { ascending: true });

                if (error) {
                    console.error('Error loading models:', error);
                    return;
                }

                // Filter to only include active models
                const filteredModels = models?.filter(m => 
                    aiModels.activeModels.includes(m.id)
                ) || [];
                
                setActiveModels(filteredModels);
            } catch (error) {
                console.error('Error loading active models:', error);
            } finally {
                setIsLoadingModels(false);
            }
        };

        loadActiveModels();
    }, [aiModels.activeModels]);

    const handleSwitchChange = (preference: keyof typeof prompts) => (checked: boolean) => {
        dispatch(setPreference({ module: 'prompts', preference, value: checked }));
    };

    const handleSelectChange = (preference: keyof typeof prompts) => (value: string) => {
        dispatch(setPreference({ module: 'prompts', preference, value }));
    };

    const handleTemperatureChange = (value: number[]) => {
        dispatch(setPreference({ module: 'prompts', preference: 'defaultTemperature', value: value[0] }));
    };

    return (
        <div className="space-y-3">
            {/* Main Settings Toggle */}
            <Card className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                        <Label htmlFor="showSettingsOnMainPage" className="text-base font-semibold">
                            Show Settings on Main Page
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Display prompt configuration settings directly on the main prompts page for quick access
                        </p>
                    </div>
                    <Switch
                        id="showSettingsOnMainPage"
                        checked={prompts.showSettingsOnMainPage}
                        onCheckedChange={handleSwitchChange('showSettingsOnMainPage')}
                        className="self-start sm:self-auto shrink-0"
                    />
                </div>
            </Card>

            {/* Model Selection */}
            <Card className="p-3">
                <div className="space-y-2.5">
                    <div>
                        <Label htmlFor="defaultModel" className="text-base font-semibold">
                            Default Model
                        </Label>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Select which AI model to use by default for new prompts
                        </p>
                    </div>
                    {isLoadingModels ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Loading active models...</span>
                        </div>
                    ) : activeModels.length === 0 ? (
                        <div className="p-2 border border-amber-500/20 bg-amber-500/5 rounded-md">
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                No active models available. Please activate models in the AI Models tab.
                            </p>
                        </div>
                    ) : (
                        <Select 
                            value={prompts.defaultModel} 
                            onValueChange={handleSelectChange('defaultModel')}
                        >
                            <SelectTrigger id="defaultModel">
                                <SelectValue placeholder="Select default model" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeModels.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.common_name || model.name}
                                        {model.provider && (
                                            <span className="text-xs text-muted-foreground ml-2">
                                                ({model.provider})
                                            </span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </Card>

            {/* Temperature Slider */}
            <Card className="p-3">
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="defaultTemperature" className="text-base font-semibold">
                            Default Temperature
                        </Label>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Control the creativity and randomness of AI responses (0 = Deterministic, 2 = Creative)
                        </p>
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Temperature:</span>
                            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {prompts.defaultTemperature.toFixed(2)}
                            </span>
                        </div>
                        <Slider
                            id="defaultTemperature"
                            min={0}
                            max={2}
                            step={0.01}
                            value={[prompts.defaultTemperature]}
                            onValueChange={handleTemperatureChange}
                            className="w-full"
                        />
                        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                            <span className="whitespace-nowrap">0.00 (Deterministic)</span>
                            <span className="whitespace-nowrap hidden sm:inline">1.00 (Balanced)</span>
                            <span className="whitespace-nowrap">2.00 (Creative)</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Web Search Toggle */}
            <Card className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                        <Label htmlFor="alwaysIncludeInternalWebSearch" className="text-base font-semibold">
                            Always Include Internal Web Search
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Automatically enable internal web search capabilities for all new prompts
                        </p>
                    </div>
                    <Switch
                        id="alwaysIncludeInternalWebSearch"
                        checked={prompts.alwaysIncludeInternalWebSearch}
                        onCheckedChange={handleSwitchChange('alwaysIncludeInternalWebSearch')}
                        className="self-start sm:self-auto shrink-0"
                    />
                </div>
            </Card>

            {/* Thinking Mode Selection */}
            <Card className="p-3">
                <div className="space-y-2.5">
                    <div>
                        <Label htmlFor="includeThinkingInAutoPrompts" className="text-base font-semibold">
                            Include "Thinking" in Auto-Generated Prompts
                        </Label>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Add reasoning steps to automatically generated prompts to improve response quality
                        </p>
                    </div>
                    <Select 
                        value={prompts.includeThinkingInAutoPrompts} 
                        onValueChange={(value) => handleSelectChange('includeThinkingInAutoPrompts')(value as ThinkingMode)}
                    >
                        <SelectTrigger id="includeThinkingInAutoPrompts">
                            <SelectValue placeholder="Select thinking mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                None
                                <span className="text-xs text-muted-foreground ml-2">
                                    (No thinking steps)
                                </span>
                            </SelectItem>
                            <SelectItem value="simple">
                                Simple Thinking
                                <span className="text-xs text-muted-foreground ml-2">
                                    (Basic reasoning)
                                </span>
                            </SelectItem>
                            <SelectItem value="deep">
                                Deep Thinking
                                <span className="text-xs text-muted-foreground ml-2">
                                    (Comprehensive analysis)
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Submit on Enter Toggle */}
            <Card className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                        <Label htmlFor="submitOnEnter" className="text-base font-semibold">
                            Submit on Enter
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Active: Enter submits message from the prompt input. Disabled: Enter creates a new line.
                        </p>
                    </div>
                    <Switch
                        id="submitOnEnter"
                        checked={prompts.submitOnEnter}
                        onCheckedChange={handleSwitchChange('submitOnEnter')}
                        className="self-start sm:self-auto shrink-0"
                    />
                </div>
            </Card>

            {/* Auto Clear Responses Toggle */}
            <Card className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                        <Label htmlFor="autoClearResponsesInEditMode" className="text-base font-semibold">
                            Auto Clear Responses in Edit Mode
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Enabled: Submitting a second message in "Edit Prompts" mode clears previous responses instead of creating a conversation chain
                        </p>
                    </div>
                    <Switch
                        id="autoClearResponsesInEditMode"
                        checked={prompts.autoClearResponsesInEditMode}
                        onCheckedChange={handleSwitchChange('autoClearResponsesInEditMode')}
                        className="self-start sm:self-auto shrink-0"
                    />
                </div>
            </Card>
        </div>
    );
};

export default PromptsPreferences;

