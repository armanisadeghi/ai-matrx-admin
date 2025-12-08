"use client";

import React, { useState } from "react";
import { Languages, Brain, BookOpen, MessageSquare, Palette, Gauge, Loader2, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePromptBuilder } from "@/features/prompts/services/promptBuilderService";
import {
    complexityLevels,
    creativityLevels,
    concisenessLevels,
    languageOptions,
    personaOptions,
    toneStyleOptions,
    cognitiveBiasOptions,
    formatStyleOptions,
} from "@/features/prompts/constants";

interface InstantChatAssistantProps {
    onClose: () => void;
}

// Generate a name based on selections
function generatePromptName(options: any): string {
    const parts = ["Chat Assistant"];

    if (options.persona) {
        parts.push(options.persona.label);
    }
    if (options.toneStyle) {
        parts.push(options.toneStyle.label);
    }

    return parts.join(" - ");
}

// Main App Component
function InstantChatAssistantComponent({ onClose }: InstantChatAssistantProps) {
    const router = useRouter();
    const { createPrompt } = usePromptBuilder(router, onClose);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedOptions, setSelectedOptions] = useState({
        language: { id: "english", label: "English", prompt: "Respond in English." },
        persona: null,
        toneStyle: null,
        cognitiveBias: null,
        formatStyle: null,
        complexity: 5,
        creativity: 5,
        conciseness: 5,
    });

    // Generate the prompt based on selected options
    const generatePrompt = () => {
        let prompt = "You are an AI assistant with the following characteristics:\n\n";

        // Language settings
        if (selectedOptions.language) {
            prompt += `${selectedOptions.language.prompt}\n\n`;
        }

        // Persona
        if (selectedOptions.persona) {
            prompt += `${selectedOptions.persona.prompt}\n\n`;
        }

        // Tone/Style
        if (selectedOptions.toneStyle) {
            prompt += `${selectedOptions.toneStyle.prompt}\n\n`;
        }

        // Cognitive Approach
        if (selectedOptions.cognitiveBias) {
            prompt += `${selectedOptions.cognitiveBias.prompt}\n\n`;
        }

        // Format Style
        if (selectedOptions.formatStyle) {
            prompt += `${selectedOptions.formatStyle.prompt}\n\n`;
        }

        // Complexity
        const complexityLevel = snapToNearestLevel(selectedOptions.complexity);
        if (complexityLevel !== 5) {
            prompt += `Complexity Level: ${complexityLevels[complexityLevel].prompt}\n\n`;
        }

        // Creativity
        const creativityLevel = snapToNearestLevel(selectedOptions.creativity);
        if (creativityLevel !== 5) {
            prompt += `Creativity Level: ${creativityLevels[creativityLevel].prompt}\n\n`;
        }

        // Conciseness
        const concisenessLevel = snapToNearestLevel(selectedOptions.conciseness);
        if (concisenessLevel !== 5) {
            prompt += `Response Length: ${concisenessLevels[concisenessLevel].prompt}\n\n`;
        }

        return prompt;
    };

    // Helper function to snap slider values to valid levels
    const snapToNearestLevel = (value: number): number => {
        const validLevels = [1, 3, 5, 7, 10];
        return validLevels.reduce((prev, curr) => (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev));
    };

    // Handle option selection
    const handleOptionSelect = (category, option) => {
        setSelectedOptions({
            ...selectedOptions,
            [category]: option,
        });
    };

    // Clear an option
    const clearOption = (category) => {
        setSelectedOptions({
            ...selectedOptions,
            [category]: null,
        });
    };

    // Handle slider changes
    const handleSliderChange = (name, value) => {
        setSelectedOptions({
            ...selectedOptions,
            [name]: value,
        });
    };

    // Create the prompt using the reusable service
    const handleCreatePrompt = async () => {
        setIsSaving(true);

        try {
            // Generate the system message
            const systemMessage = generatePrompt();

            // Auto-generate name
            const autoName = generatePromptName(selectedOptions);

            // Use the prompt builder service
            await createPrompt({
                name: autoName,
                systemMessage,
                userMessage: "",
                variableDefaults: [],
            });
        } catch (error) {
            console.error("Error in handleCreatePrompt:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-auto p-3 sm:p-4">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Left Column */}
                        <div className="space-y-3">
                            {/* Language Selection */}
                            <div className="border-border rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Languages className="text-blue-500 dark:text-blue-400" size={16} />
                                    <h3 className="text-sm font-medium">Language</h3>
                                </div>

                                <Select
                                    value={selectedOptions.language?.id}
                                    onValueChange={(value) => {
                                        const option = languageOptions.find((opt) => opt.id === value);
                                        if (option) handleOptionSelect("language", option);
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {languageOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Persona Selection */}
                            <div className="border-border rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="text-yellow-500 dark:text-yellow-400" size={16} />
                                    <h3 className="text-sm font-medium">Persona</h3>
                                </div>

                                <Select
                                    value={selectedOptions.persona?.id || "none"}
                                    onValueChange={(value) => {
                                        if (value === "none") {
                                            clearOption("persona");
                                        } else {
                                            const option = personaOptions.find((opt) => opt.id === value);
                                            if (option) handleOptionSelect("persona", option);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Default assistant)</SelectItem>
                                        {personaOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Cognitive Approach */}
                            <div className="border-border rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain className="text-green-500 dark:text-green-400" size={16} />
                                    <h3 className="text-sm font-medium">Cognitive Approach</h3>
                                </div>

                                <Select
                                    value={selectedOptions.cognitiveBias?.id || "none"}
                                    onValueChange={(value) => {
                                        if (value === "none") {
                                            clearOption("cognitiveBias");
                                        } else {
                                            const option = cognitiveBiasOptions.find((opt) => opt.id === value);
                                            if (option) handleOptionSelect("cognitiveBias", option);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Balanced approach)</SelectItem>
                                        {cognitiveBiasOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                <div className="flex flex-col py-1">
                                                    <span className="font-medium">{option.label}</span>
                                                    <span className="text-xs text-muted-foreground mt-0.5">{option.shortDesc}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Format Style */}
                            <div className="border-border rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="text-red-500 dark:text-red-400" size={16} />
                                    <h3 className="text-sm font-medium">Format Style</h3>
                                </div>

                                <Select
                                    value={selectedOptions.formatStyle?.id || "none"}
                                    onValueChange={(value) => {
                                        if (value === "none") {
                                            clearOption("formatStyle");
                                        } else {
                                            const option = formatStyleOptions.find((opt) => opt.id === value);
                                            if (option) handleOptionSelect("formatStyle", option);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Default format)</SelectItem>
                                        {formatStyleOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Tone/Style Selection */}
                            <div className="border-border rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Palette className="text-pink-500 dark:text-pink-400" size={16} />
                                    <h3 className="text-sm font-medium">Tone & Style</h3>
                                </div>

                                <Select
                                    value={selectedOptions.toneStyle?.id || "none"}
                                    onValueChange={(value) => {
                                        if (value === "none") {
                                            clearOption("toneStyle");
                                        } else {
                                            const option = toneStyleOptions.find((opt) => opt.id === value);
                                            if (option) handleOptionSelect("toneStyle", option);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Neutral tone)</SelectItem>
                                        {toneStyleOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-3">
                            {/* Fine-Tuning */}
                            <div className="border-border rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <Gauge className="text-indigo-500 dark:text-indigo-400" size={16} />
                                    <h3 className="text-sm font-medium">Fine-Tuning</h3>
                                </div>

                                <div className="space-y-4">
                                    {/* Complexity */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-medium">Complexity</label>
                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                {complexityLevels[snapToNearestLevel(selectedOptions.complexity)].label}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            value={selectedOptions.complexity}
                                            onChange={(e) => handleSliderChange("complexity", snapToNearestLevel(parseInt(e.target.value)))}
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Elementary</span>
                                            <span>Standard</span>
                                            <span>Expert</span>
                                        </div>
                                    </div>

                                    {/* Creativity */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-medium">Creativity</label>
                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                {creativityLevels[snapToNearestLevel(selectedOptions.creativity)].label}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            value={selectedOptions.creativity}
                                            onChange={(e) => handleSliderChange("creativity", snapToNearestLevel(parseInt(e.target.value)))}
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Literal</span>
                                            <span>Balanced</span>
                                            <span>Experimental</span>
                                        </div>
                                    </div>

                                    {/* Conciseness */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-medium">Conciseness</label>
                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                {concisenessLevels[snapToNearestLevel(selectedOptions.conciseness)].label}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            value={selectedOptions.conciseness}
                                            onChange={(e) =>
                                                handleSliderChange("conciseness", snapToNearestLevel(parseInt(e.target.value)))
                                            }
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>Minimal</span>
                                            <span>Moderate</span>
                                            <span>Comprehensive</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Button */}
            <div className="flex-shrink-0 p-3 border-t bg-muted/30">
                <Button
                    onClick={handleCreatePrompt}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            Create Prompt
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

export default InstantChatAssistantComponent;
