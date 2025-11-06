"use client";

import React, { useState } from "react";
import { Zap, Languages, Brain, BookOpen, MessageSquare, Palette, Gauge, Loader2, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
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

// Main App Component
function InstantChatAssistantComponent({ onClose }: InstantChatAssistantProps) {
    const router = useRouter();
    const [promptName, setPromptName] = useState("");
    const [promptDescription, setPromptDescription] = useState("");
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

    // Create the prompt
    const handleCreatePrompt = async () => {
        if (!promptName.trim()) {
            toast.error('Please enter a name for your prompt');
            return;
        }

        setIsSaving(true);
        
        try {
            const supabase = createClient();
            
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Generate the system message
            const systemMessage = generatePrompt();

            // Create new prompt
            const promptId = uuidv4();
            const dbPromptData = {
                id: promptId,
                user_id: user.id,
                name: promptName.trim(),
                description: promptDescription.trim() || null,
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: ""
                    }
                ],
                variable_defaults: [],
                settings: {
                    model_id: "548126f2-714a-4562-9001-0c31cbeea375",
                    store: true,
                    tools: [],
                    top_p: 1,
                    stream: true,
                    temperature: 1,
                    max_tokens: 4096
                },
            };

            const { error: insertError } = await supabase
                .from('prompts')
                .insert([dbPromptData]);

            if (insertError) {
                throw insertError;
            }

            toast.success('Prompt created successfully!', {
                description: 'Opening prompt editor with test runner...'
            });

            // Close modal and navigate to the new prompt with autoRun query param
            onClose();
            router.push(`/ai/prompts/edit/${promptId}?autoRun=true`);
            router.refresh();
            
        } catch (error) {
            console.error('Error creating prompt:', error);
            toast.error('Failed to create prompt', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-6">
            {/* Prompt Details Section */}
            <div className="mb-6 space-y-4">
                <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                        Prompt Name
                        <span className="text-xs text-red-500">*</span>
                    </Label>
                    <Input
                        value={promptName}
                        onChange={(e) => setPromptName(e.target.value)}
                        placeholder="Enter a name for your chat assistant"
                        className="text-sm"
                        disabled={isSaving}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-medium">
                        Description
                        <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                    </Label>
                    <Input
                        value={promptDescription}
                        onChange={(e) => setPromptDescription(e.target.value)}
                        placeholder="Briefly describe what this assistant does"
                        className="text-sm"
                        disabled={isSaving}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="bg-textured p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold mb-6 flex items-center">
                        <Zap className="mr-2 text-purple-600 dark:text-purple-400" size={20} />
                        Configure Assistant Characteristics
                    </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        {/* Language Selection */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h2 className="text-lg font-medium flex items-center mb-3">
                                <Languages className="mr-2 text-blue-500 dark:text-blue-400" size={20} />
                                Language
                            </h2>

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
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h2 className="text-lg font-medium flex items-center mb-3">
                                <MessageSquare className="mr-2 text-yellow-500 dark:text-yellow-400" size={20} />
                                Persona
                            </h2>

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
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h2 className="text-lg font-medium flex items-center mb-3">
                                <Brain className="mr-2 text-green-500 dark:text-green-400" size={20} />
                                Cognitive Approach
                            </h2>

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
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h2 className="text-lg font-medium flex items-center mb-3">
                                <BookOpen className="mr-2 text-red-500 dark:text-red-400" size={20} />
                                Format Style
                            </h2>

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
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h2 className="text-lg font-medium flex items-center mb-3">
                                <Palette className="mr-2 text-pink-500 dark:text-pink-400" size={20} />
                                Tone & Style
                            </h2>

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
                    <div className="space-y-4">
                        {/* Fine-Tuning */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h2 className="text-lg font-medium flex items-center mb-3">
                                <Gauge className="mr-2 text-indigo-500 dark:text-indigo-400" size={20} />
                                Fine-Tuning
                            </h2>

                            <div className="space-y-6">
                                {/* Complexity */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium">Complexity</label>
                                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                            {complexityLevels[snapToNearestLevel(selectedOptions.complexity)].label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        Controls conceptual depth and sophistication of responses
                                    </p>
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
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium">Creativity</label>
                                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                            {creativityLevels[snapToNearestLevel(selectedOptions.creativity)].label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        Controls novelty, unconventionality, and imaginative approaches
                                    </p>
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
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium">Conciseness</label>
                                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                            {concisenessLevels[snapToNearestLevel(selectedOptions.conciseness)].label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Controls verbosity and level of detail</p>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={selectedOptions.conciseness}
                                        onChange={(e) => handleSliderChange("conciseness", snapToNearestLevel(parseInt(e.target.value)))}
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

                {/* Create Button Section */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Your assistant will be created with these characteristics
                    </p>
                    <Button
                        onClick={handleCreatePrompt}
                        disabled={!promptName.trim() || isSaving}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
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
            </div>
        </div>
    );
}

export default InstantChatAssistantComponent;
