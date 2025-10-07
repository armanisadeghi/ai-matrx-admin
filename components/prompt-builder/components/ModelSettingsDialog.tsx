"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ModelSettings {
    textFormat: string;
    toolChoice: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    storeLogs: boolean;
    reasoningEffort?: string;
    verbosity?: string;
    summary?: string;
}

interface ModelSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    model: string;
    settings: ModelSettings;
    onSettingsChange: (settings: ModelSettings) => void;
}

export default function ModelSettingsDialog({
    isOpen,
    onClose,
    model,
    settings,
    onSettingsChange,
}: ModelSettingsDialogProps) {
    if (!isOpen) return null;

    // Determine which settings to show based on model
    const isO1Model = model.includes("o1") || model.includes("reasoning");
    const isGPT4O = model === "gpt-4o";

    const handleSettingChange = (key: keyof ModelSettings, value: any) => {
        onSettingsChange({
            ...settings,
            [key]: value,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
                <div 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Model Settings
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={onClose}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Text Format */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Text format
                        </Label>
                        <Select
                            value={settings.textFormat}
                            onValueChange={(value) => handleSettingChange("textFormat", value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">text</SelectItem>
                                <SelectItem value="json_object">json_object</SelectItem>
                                <SelectItem value="json_schema">json_schema</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Reasoning Effort (o1 models only) */}
                    {isO1Model && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Reasoning effort
                            </Label>
                            <Select
                                value={settings.reasoningEffort || "medium"}
                                onValueChange={(value) => handleSettingChange("reasoningEffort", value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">low</SelectItem>
                                    <SelectItem value="medium">medium</SelectItem>
                                    <SelectItem value="high">high</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Verbosity (o1 models only) */}
                    {isO1Model && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Verbosity
                            </Label>
                            <Select
                                value={settings.verbosity || "medium"}
                                onValueChange={(value) => handleSettingChange("verbosity", value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">low</SelectItem>
                                    <SelectItem value="medium">medium</SelectItem>
                                    <SelectItem value="high">high</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Summary (o1 models only) */}
                    {isO1Model && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Summary
                            </Label>
                            <Select
                                value={settings.summary || "auto"}
                                onValueChange={(value) => handleSettingChange("summary", value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">auto</SelectItem>
                                    <SelectItem value="enabled">enabled</SelectItem>
                                    <SelectItem value="disabled">disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Tool Choice */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Tool choice
                        </Label>
                        <Select
                            value={settings.toolChoice}
                            onValueChange={(value) => handleSettingChange("toolChoice", value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">auto</SelectItem>
                                <SelectItem value="required">required</SelectItem>
                                <SelectItem value="none">none</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Temperature (not for o1 models) */}
                    {!isO1Model && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Temperature
                                </Label>
                                <input
                                    type="number"
                                    min="0"
                                    max="2"
                                    step="0.01"
                                    value={settings.temperature}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val >= 0 && val <= 2) {
                                            handleSettingChange("temperature", val);
                                        }
                                    }}
                                    className="w-20 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <Slider
                                min={0}
                                max={2}
                                step={0.01}
                                value={[settings.temperature]}
                                onValueChange={(value) => handleSettingChange("temperature", value[0])}
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* Max Tokens (not for o1 models) */}
                    {!isO1Model && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Max tokens
                                </Label>
                                <input
                                    type="number"
                                    min="1"
                                    max="32768"
                                    step="1"
                                    value={settings.maxTokens}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val >= 1 && val <= 32768) {
                                            handleSettingChange("maxTokens", val);
                                        }
                                    }}
                                    className="w-24 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <Slider
                                min={1}
                                max={32768}
                                step={1}
                                value={[settings.maxTokens]}
                                onValueChange={(value) => handleSettingChange("maxTokens", value[0])}
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* Top P (not for o1 models) */}
                    {!isO1Model && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Top P
                                </Label>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={settings.topP}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val >= 0 && val <= 1) {
                                            handleSettingChange("topP", val);
                                        }
                                    }}
                                    className="w-20 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <Slider
                                min={0}
                                max={1}
                                step={0.01}
                                value={[settings.topP]}
                                onValueChange={(value) => handleSettingChange("topP", value[0])}
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* Store Logs */}
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Store logs
                        </Label>
                        <button
                            onClick={() => handleSettingChange("storeLogs", !settings.storeLogs)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.storeLogs
                                    ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-gray-300 dark:bg-gray-600"
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    settings.storeLogs ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

