"use client";

import React from "react";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useModelControls } from "@/features/prompts/hooks/useModelControls";
import { PromptSettings } from "@/features/prompts/types/core";

interface ModelSettingsProps {
    modelId: string;
    models: any[];
    settings: PromptSettings;
    onSettingsChange: (settings: PromptSettings) => void;
    availableTools?: any[]; // Array of database tool objects
}

export function ModelSettings({
    modelId,
    models,
    settings,
    onSettingsChange,
    availableTools = [],
}: ModelSettingsProps) {
    // Get normalized controls for the selected model
    const { normalizedControls, error } = useModelControls(models, modelId);

    const handleSettingChange = (key: keyof PromptSettings, value: any) => {
        onSettingsChange({
            ...settings,
            [key]: value,
        });
    };

    if (error || !normalizedControls) {
        return (
            <div className="text-xs text-red-600 dark:text-red-400">
                Error loading model controls: {error}
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {/* Output Format */}
            <div className="flex items-center gap-3">
                <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.output_format ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                    Output format
                    {!normalizedControls.output_format && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                </Label>
                <Select
                    value={settings.output_format || normalizedControls.output_format?.default || "text"}
                    onValueChange={(value) => handleSettingChange("output_format", value)}
                    disabled={!normalizedControls.output_format}
                >
                    <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                        {normalizedControls.output_format?.enum?.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs py-1">
                                {option}
                            </SelectItem>
                        )) || (
                            <>
                        <SelectItem value="text" className="text-xs py-1">text</SelectItem>
                        <SelectItem value="json_object" className="text-xs py-1">json_object</SelectItem>
                        <SelectItem value="json_schema" className="text-xs py-1">json_schema</SelectItem>
                            </>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Temperature */}
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.temperature ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Temperature
                        {!normalizedControls.temperature && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <div className="flex-1 flex items-center gap-2">
                        {normalizedControls.temperature && (
                            <>
                                <Slider
                                    min={normalizedControls.temperature?.min ?? 0}
                                    max={normalizedControls.temperature?.max ?? 2}
                                    step={0.01}
                                    value={[settings.temperature ?? normalizedControls.temperature?.default ?? normalizedControls.temperature?.min ?? 1]}
                                    onValueChange={(value) => handleSettingChange("temperature", value[0])}
                                    className="flex-1"
                                />
                                <input
                                    type="number"
                                    min={normalizedControls.temperature?.min ?? 0}
                                    max={normalizedControls.temperature?.max ?? 2}
                                    step={0.01}
                                    value={settings.temperature ?? normalizedControls.temperature?.default ?? normalizedControls.temperature?.min ?? 1}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            handleSettingChange("temperature", val);
                                        }
                                    }}
                                    className="w-16 h-7 px-2 text-xs text-gray-900 dark:text-gray-100 bg-textured border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-600"
                                />
                            </>
                        )}
                        {!normalizedControls.temperature && (
                            <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-800 rounded opacity-50"></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Max Tokens */}
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.max_tokens ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Max tokens
                        {!normalizedControls.max_tokens && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <div className="flex-1 flex items-center gap-2">
                        {normalizedControls.max_tokens && (
                            <>
                                <Slider
                                    min={normalizedControls.max_tokens?.min ?? 1}
                                    max={normalizedControls.max_tokens?.max ?? 16000}
                                    step={1}
                                    value={[settings.max_tokens ?? normalizedControls.max_tokens?.default ?? normalizedControls.max_tokens?.min ?? 4096]}
                                    onValueChange={(value) => handleSettingChange("max_tokens", value[0])}
                                    className="flex-1"
                                />
                                <input
                                    type="number"
                                    min={normalizedControls.max_tokens?.min ?? 1}
                                    max={normalizedControls.max_tokens?.max ?? 16000}
                                    step={1}
                                    value={settings.max_tokens ?? normalizedControls.max_tokens?.default ?? normalizedControls.max_tokens?.min ?? 4096}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val)) {
                                            handleSettingChange("max_tokens", val);
                                        }
                                    }}
                                    className="w-20 h-7 px-2 text-xs text-gray-900 dark:text-gray-100 bg-textured border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-600"
                                />
                            </>
                        )}
                        {!normalizedControls.max_tokens && (
                            <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-800 rounded opacity-50"></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top P */}
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.top_p ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Top P
                        {!normalizedControls.top_p && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <div className="flex-1 flex items-center gap-2">
                        {normalizedControls.top_p && (
                            <>
                                <Slider
                                    min={normalizedControls.top_p?.min ?? 0}
                                    max={normalizedControls.top_p?.max ?? 1}
                                    step={0.01}
                                    value={[settings.top_p ?? normalizedControls.top_p?.default ?? normalizedControls.top_p?.min ?? 1]}
                                    onValueChange={(value) => handleSettingChange("top_p", value[0])}
                                    className="flex-1"
                                />
                                <input
                                    type="number"
                                    min={normalizedControls.top_p?.min ?? 0}
                                    max={normalizedControls.top_p?.max ?? 1}
                                    step={0.01}
                                    value={settings.top_p ?? normalizedControls.top_p?.default ?? normalizedControls.top_p?.min ?? 1}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            handleSettingChange("top_p", val);
                                        }
                                    }}
                                    className="w-16 h-7 px-2 text-xs text-gray-900 dark:text-gray-100 bg-textured border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-600"
                                />
                            </>
                        )}
                        {!normalizedControls.top_p && (
                            <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-800 rounded opacity-50"></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top K */}
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.top_k ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Top K
                        {!normalizedControls.top_k && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <div className="flex-1 flex items-center gap-2">
                        {normalizedControls.top_k && (
                            <>
                                <Slider
                                    min={normalizedControls.top_k?.min ?? 1}
                                    max={normalizedControls.top_k?.max ?? 100}
                                    step={1}
                                    value={[settings.top_k ?? normalizedControls.top_k?.default ?? normalizedControls.top_k?.min ?? 50]}
                                    onValueChange={(value) => handleSettingChange("top_k", value[0])}
                                    className="flex-1"
                                />
                                <input
                                    type="number"
                                    min={normalizedControls.top_k?.min ?? 1}
                                    max={normalizedControls.top_k?.max ?? 100}
                                    step={1}
                                    value={settings.top_k ?? normalizedControls.top_k?.default ?? normalizedControls.top_k?.min ?? 50}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val)) {
                                            handleSettingChange("top_k", val);
                                        }
                                    }}
                                    className="w-16 h-7 px-2 text-xs text-gray-900 dark:text-gray-100 bg-textured border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-600"
                                />
                            </>
                        )}
                        {!normalizedControls.top_k && (
                            <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-800 rounded opacity-50"></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reasoning Effort */}
            <div className="flex items-center gap-3">
                <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.reasoning_effort ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Reasoning effort
                    {!normalizedControls.reasoning_effort && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <Select
                    value={settings.reasoning_effort || normalizedControls.reasoning_effort?.default || "medium"}
                    onValueChange={(value) => handleSettingChange("reasoning_effort", value)}
                    disabled={!normalizedControls.reasoning_effort}
                    >
                    <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                        </SelectTrigger>
                    <SelectContent className="text-xs">
                        {normalizedControls.reasoning_effort?.enum?.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs py-1">
                                {option}
                            </SelectItem>
                        )) || (
                            <>
                            <SelectItem value="none" className="text-xs py-1">none</SelectItem>
                            <SelectItem value="low" className="text-xs py-1">low</SelectItem>
                            <SelectItem value="medium" className="text-xs py-1">medium</SelectItem>
                            <SelectItem value="high" className="text-xs py-1">high</SelectItem>
                            </>
                        )}
                        </SelectContent>
                    </Select>
                </div>

            {/* Verbosity */}
            <div className="flex items-center gap-3">
                <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.verbosity ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Verbosity
                    {!normalizedControls.verbosity && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <Select
                    value={settings.verbosity || normalizedControls.verbosity?.default || "medium"}
                        onValueChange={(value) => handleSettingChange("verbosity", value)}
                    disabled={!normalizedControls.verbosity}
                    >
                    <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                        </SelectTrigger>
                    <SelectContent className="text-xs">
                        {normalizedControls.verbosity?.enum?.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs py-1">
                                {option}
                            </SelectItem>
                        )) || (
                            <>
                            <SelectItem value="low" className="text-xs py-1">low</SelectItem>
                            <SelectItem value="medium" className="text-xs py-1">medium</SelectItem>
                            <SelectItem value="high" className="text-xs py-1">high</SelectItem>
                            </>
                        )}
                        </SelectContent>
                    </Select>
                </div>

            {/* Summary */}
            <div className="flex items-center gap-3">
                <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.reasoning_summary ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Summary
                    {!normalizedControls.reasoning_summary && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <Select
                    value={settings.reasoning_summary || normalizedControls.reasoning_summary?.default || "auto"}
                    onValueChange={(value) => handleSettingChange("reasoning_summary", value)}
                    disabled={!normalizedControls.reasoning_summary}
                    >
                    <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                        </SelectTrigger>
                    <SelectContent className="text-xs">
                        {normalizedControls.reasoning_summary?.enum?.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs py-1">
                                {option}
                            </SelectItem>
                        )) || (
                            <>
                            <SelectItem value="auto" className="text-xs py-1">auto</SelectItem>
                            <SelectItem value="enabled" className="text-xs py-1">enabled</SelectItem>
                            <SelectItem value="disabled" className="text-xs py-1">disabled</SelectItem>
                            </>
                        )}
                        </SelectContent>
                    </Select>
                </div>

            {/* Tool Choice */}
            <div className="flex items-center gap-3">
                <Label className={`text-xs flex-shrink-0 w-32 ${normalizedControls.tool_choice ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                    Tool choice
                    {!normalizedControls.tool_choice && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                </Label>
                <Select
                    value={settings.tool_choice || normalizedControls.tool_choice?.default || "auto"}
                    onValueChange={(value) => handleSettingChange("tool_choice", value)}
                    disabled={!normalizedControls.tool_choice}
                >
                    <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                        {normalizedControls.tool_choice?.enum?.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs py-1">
                                {option}
                            </SelectItem>
                        )) || (
                            <>
                            <SelectItem value="auto" className="text-xs py-1">auto</SelectItem>
                            <SelectItem value="required" className="text-xs py-1">required</SelectItem>
                            <SelectItem value="none" className="text-xs py-1">none</SelectItem>
                            </>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Divider for toggle section */}
            <div className="pt-1 border-t border-border" />

            {/* Toggle Switches Grid - Note: Tools selection is handled in ToolsManager, not here */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">

                {/* Store */}
                <div className="flex items-center justify-between gap-2">
                    <Label className={`text-xs ${normalizedControls.store ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Store
                        {!normalizedControls.store && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                        </Label>
                    <button
                        onClick={() => normalizedControls.store && handleSettingChange("store", !settings.store)}
                        disabled={!normalizedControls.store}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                            normalizedControls.store 
                                ? (settings.store
                                    ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-gray-300 dark:bg-gray-700")
                                : "bg-gray-200 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                        }`}
                    >
                        <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                                settings.store ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                        />
                    </button>
                    </div>

                {/* Stream */}
                <div className="flex items-center justify-between gap-2">
                    <Label className={`text-xs ${normalizedControls.stream ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Stream
                        {!normalizedControls.stream && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <button
                        onClick={() => normalizedControls.stream && handleSettingChange("stream", !settings.stream)}
                        disabled={!normalizedControls.stream}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                            normalizedControls.stream 
                                ? (settings.stream
                                    ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-gray-300 dark:bg-gray-700")
                                : "bg-gray-200 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                        }`}
                    >
                        <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                                settings.stream ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                        />
                    </button>
                </div>

                {/* Parallel Tool Calls */}
                <div className="flex items-center justify-between gap-2">
                    <Label className={`text-xs ${normalizedControls.parallel_tool_calls ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Parallel tools
                        {!normalizedControls.parallel_tool_calls && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                        </Label>
                    <button
                        onClick={() => normalizedControls.parallel_tool_calls && handleSettingChange("parallel_tool_calls", !settings.parallel_tool_calls)}
                        disabled={!normalizedControls.parallel_tool_calls}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                            normalizedControls.parallel_tool_calls 
                                ? (settings.parallel_tool_calls
                                    ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-gray-300 dark:bg-gray-700")
                                : "bg-gray-200 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                        }`}
                    >
                        <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                                settings.parallel_tool_calls ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                        />
                    </button>
                    </div>

                {/* Image URLs */}
                <div className="flex items-center justify-between gap-2">
                    <Label className={`text-xs ${normalizedControls.image_urls ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Image URLs
                        {!normalizedControls.image_urls && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <button
                        onClick={() => normalizedControls.image_urls && handleSettingChange("image_urls", !settings.image_urls)}
                        disabled={!normalizedControls.image_urls}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                            normalizedControls.image_urls 
                                ? (settings.image_urls
                                    ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-gray-300 dark:bg-gray-700")
                                : "bg-gray-200 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                        }`}
                    >
                        <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                                settings.image_urls ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                        />
                    </button>
                </div>

                {/* File URLs */}
                <div className="flex items-center justify-between gap-2">
                    <Label className={`text-xs ${normalizedControls.file_urls ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        File URLs
                        {!normalizedControls.file_urls && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                        </Label>
                    <button
                        onClick={() => normalizedControls.file_urls && handleSettingChange("file_urls", !settings.file_urls)}
                        disabled={!normalizedControls.file_urls}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                            normalizedControls.file_urls 
                                ? (settings.file_urls
                                    ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-gray-300 dark:bg-gray-700")
                                : "bg-gray-200 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                        }`}
                    >
                        <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                                settings.file_urls ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                        />
                    </button>
                    </div>

                {/* Internal Web Search */}
                <div className="flex items-center justify-between gap-2">
                    <Label className={`text-xs ${normalizedControls.internal_web_search ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        Web search
                        {!normalizedControls.internal_web_search && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                    </Label>
                    <button
                        onClick={() => normalizedControls.internal_web_search && handleSettingChange("internal_web_search", !settings.internal_web_search)}
                        disabled={!normalizedControls.internal_web_search}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                            normalizedControls.internal_web_search 
                                ? (settings.internal_web_search
                                    ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-gray-300 dark:bg-gray-700")
                                : "bg-gray-200 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                        }`}
                    >
                        <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                                settings.internal_web_search ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                        />
                    </button>
                </div>

                {/* YouTube Videos */}
                <div className="flex items-center justify-between gap-2">
                    <Label className={`text-xs ${normalizedControls.youtube_videos ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        YouTube
                        {!normalizedControls.youtube_videos && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                </Label>
                <button
                        onClick={() => normalizedControls.youtube_videos && handleSettingChange("youtube_videos", !settings.youtube_videos)}
                        disabled={!normalizedControls.youtube_videos}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                            normalizedControls.youtube_videos 
                                ? (settings.youtube_videos
                            ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-gray-300 dark:bg-gray-700")
                                : "bg-gray-200 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                    }`}
                >
                    <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                                settings.youtube_videos ? "translate-x-[18px]" : "translate-x-0.5"
                        }`}
                    />
                </button>
                </div>
            </div>

            {/* Tools Section */}
            {availableTools.length > 0 && normalizedControls.tools && (
                <>
                    <div className="pt-1 border-t border-border" />
                    
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-700 dark:text-gray-300">
                            Tools {!normalizedControls.tools && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
                        </Label>
                        
                        {/* Add Tool Dropdown */}
                        {availableTools.filter(tool => !settings.tools?.includes(typeof tool === 'string' ? tool : tool.name)).length > 0 && (
                            <div className="flex gap-2">
                                <Select
                                    value=""
                                    onValueChange={(toolName) => {
                                        if (toolName) {
                                            const newTools = [...(settings.tools || []), toolName];
                                            handleSettingChange("tools", newTools);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-7 text-xs flex-1">
                                        <SelectValue placeholder="Select a tool to add..." />
                                    </SelectTrigger>
                                    <SelectContent className="text-xs max-h-[200px]">
                                        {availableTools
                                            .filter(tool => !settings.tools?.includes(typeof tool === 'string' ? tool : tool.name))
                                            .map((tool, index) => {
                                                const toolName = typeof tool === 'string' ? tool : tool.name;
                                                return (
                                                    <SelectItem key={index} value={toolName} className="text-xs py-1">
                                                        {toolName}
                                                    </SelectItem>
                                                );
                                            })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        {/* Selected Tools List */}
                        {settings.tools && settings.tools.length > 0 ? (
                            <div className="space-y-1">
                                {settings.tools.map((toolName, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                    >
                                        <span className="text-green-700 dark:text-green-300 font-medium">{toolName}</span>
                                        <button
                                            onClick={() => {
                                                const newTools = settings.tools?.filter((_, i) => i !== index) || [];
                                                handleSettingChange("tools", newTools);
                                            }}
                                            className="text-green-600 dark:text-green-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                            title="Remove tool"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-2">
                                No tools selected
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

