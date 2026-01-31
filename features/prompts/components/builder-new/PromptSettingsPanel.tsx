import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
    selectPromptSettings,
    switchModel,
    updateSettings
} from '@/lib/redux/slices/promptEditorSlice';
import {
    selectAvailableModels,
    selectModelOptions,
    fetchAvailableModels
} from '@/lib/redux/slices/modelRegistrySlice';
import { useModelControls } from '@/features/prompts/hooks/useModelControls';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const PromptSettingsPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectPromptSettings);
    const models = useAppSelector(selectAvailableModels);
    const modelOptions = useAppSelector(selectModelOptions);

    // Use the existing hook to normalize controls
    const { normalizedControls, selectedModel } = useModelControls(models, settings.model_id || '');

    // Fetch models if not available
    useEffect(() => {
        if (models.length === 0) {
            dispatch(fetchAvailableModels());
        }
    }, [dispatch, models.length]);

    const handleModelChange = (value: string) => {
        dispatch(switchModel(value));
    };

    const handleSettingChange = (key: string, value: any) => {
        dispatch(updateSettings({ [key]: value }));
    };

    if (!selectedModel) {
        return (
            <Card className="h-full border-l rounded-none">
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Model</Label>
                            <Select onValueChange={handleModelChange} value={settings.model_id || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {modelOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-sm text-muted-foreground">Select a model to configure settings.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-l rounded-none flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Model Settings</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
                <CardContent className="space-y-6">
                    {/* Model Selection */}
                    <div className="space-y-2">
                        <Label>Model</Label>
                        <Select onValueChange={handleModelChange} value={settings.model_id || ''}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                {modelOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex flex-col items-start">
                                            <span>{option.label}</span>
                                            <span className="text-xs text-muted-foreground capitalize">{option.provider}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedModel.description && (
                            <p className="text-xs text-muted-foreground mt-1">{selectedModel.description}</p>
                        )}
                    </div>

                    <Separator />

                    {/* Dynamic Controls */}
                    {normalizedControls && (
                        <div className="space-y-6">
                            {/* Temperature */}
                            {normalizedControls.temperature && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2">
                                            <Label>Temperature</Label>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Info className="h-3 w-3 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Controls randomness: Lowering results in less random completions.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {settings.temperature ?? normalizedControls.temperature.default ?? 0.7}
                                        </span>
                                    </div>
                                    <Slider
                                        value={[settings.temperature ?? (normalizedControls.temperature.default as number) ?? 0.7]}
                                        min={normalizedControls.temperature.min ?? 0}
                                        max={normalizedControls.temperature.max ?? 2}
                                        step={0.01}
                                        onValueChange={([value]) => handleSettingChange('temperature', value)}
                                    />
                                </div>
                            )}

                            {/* Max Tokens */}
                            {normalizedControls.max_tokens && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2">
                                            <Label>Max Tokens</Label>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Info className="h-3 w-3 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>The maximum number of tokens to generate.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {/* @ts-ignore - max_tokens may not exist in PromptSettings type */}
                                            {settings.max_tokens ?? normalizedControls.max_tokens.default ?? 1000}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <Slider
                                            className="flex-1"
                                            {/* @ts-ignore - max_tokens may not exist in PromptSettings type */}
                                            value={[settings.max_tokens ?? (normalizedControls.max_tokens.default as number) ?? 1000]}
                                            min={normalizedControls.max_tokens.min ?? 1}
                                            max={normalizedControls.max_tokens.max ?? 4096}
                                            step={1}
                                            onValueChange={([value]) => handleSettingChange('max_tokens', value)}
                                        />
                                        <Input
                                            type="number"
                                            className="w-20 h-8 text-xs"
                                            {/* @ts-ignore - max_tokens may not exist in PromptSettings type */}
                                            value={settings.max_tokens ?? (normalizedControls.max_tokens.default as number) ?? 1000}
                                            onChange={(e) => handleSettingChange('max_tokens', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Top P */}
                            {normalizedControls.top_p && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2">
                                            <Label>Top P</Label>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Info className="h-3 w-3 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Nucleus sampling: limits the generated tokens to the top p probability mass.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {settings.top_p ?? normalizedControls.top_p.default ?? 1}
                                        </span>
                                    </div>
                                    <Slider
                                        value={[settings.top_p ?? (normalizedControls.top_p.default as number) ?? 1]}
                                        min={normalizedControls.top_p.min ?? 0}
                                        max={normalizedControls.top_p.max ?? 1}
                                        step={0.01}
                                        onValueChange={([value]) => handleSettingChange('top_p', value)}
                                    />
                                </div>
                            )}

                            <Separator />

                            {/* Capabilities / Flags */}
                            <div className="space-y-4">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Capabilities</Label>

                                {normalizedControls.stream && (
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="stream-mode" className="cursor-pointer">Stream Response</Label>
                                        <Switch
                                            id="stream-mode"
                                            checked={settings.stream ?? (normalizedControls.stream.default as boolean) ?? false}
                                            onCheckedChange={(checked) => handleSettingChange('stream', checked)}
                                        />
                                    </div>
                                )}

                                {normalizedControls.json_mode && (
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="json-mode" className="cursor-pointer">JSON Mode</Label>
                                        <Switch
                                            id="json-mode"
                                            checked={settings.output_format === 'json_object'}
                                            onCheckedChange={(checked) => handleSettingChange('output_format', checked ? 'json_object' : undefined)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </ScrollArea>
        </Card>
    );
};
