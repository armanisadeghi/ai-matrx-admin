/**
 * AI Customizer Prompt Builder Wrapper
 * 
 * Wraps the modular AI customization panel with prompt creation functionality
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { usePromptBuilder } from "@/features/prompts/services/promptBuilderService";
import { AICustomizationPanel } from "@/app/(authenticated)/ai/prompts/experimental/chatbot-customizer/modular/base-components";
import { aiCustomizationConfig } from "@/app/(authenticated)/ai/prompts/experimental/chatbot-customizer/modular/aiCustomizationConfig";
import { ConfigState } from "@/app/(authenticated)/ai/prompts/experimental/chatbot-customizer/modular/types";

interface AICustomizerPromptBuilderProps {
    onClose: () => void;
}

export default function AICustomizerPromptBuilder({ onClose }: AICustomizerPromptBuilderProps) {
    const router = useRouter();
    const { createPrompt } = usePromptBuilder(router, onClose);
    const [isSaving, setIsSaving] = useState(false);
    const [customizationState, setCustomizationState] = useState<Record<string, ConfigState>>({});
    const [stateInitialized, setStateInitialized] = useState(false);

    // Generate system message from customization state
    const generateSystemMessage = (state: Record<string, ConfigState>): string => {
        let prompt = "You are an AI assistant with the following characteristics:\n\n";

        // Communication Style
        if (state.communicationStyle) {
            const comm = state.communicationStyle;
            prompt += "**Communication Style:**\n";
            
            if (comm.personality) {
                prompt += `- Personality: ${comm.personality}\n`;
            }
            if (comm.tone) {
                prompt += `- Tone: ${comm.tone}\n`;
            }
            if (comm.verbosity !== undefined) {
                const verbosityLevel = parseInt(comm.verbosity as string) < 30 ? "concise" : parseInt(comm.verbosity as string) > 70 ? "detailed" : "balanced";
                prompt += `- Verbosity: ${verbosityLevel}\n`;
            }
            if (comm.formality !== undefined) {
                const formalityLevel = parseInt(comm.formality as string) < 30 ? "casual" : parseInt(comm.formality as string) > 70 ? "formal" : "balanced";
                prompt += `- Formality: ${formalityLevel}\n`;
            }
            if (comm.emoji) {
                prompt += "- Use emojis appropriately\n";
            }
            if (comm.citations) {
                prompt += "- Provide citations and sources when applicable\n";
            }
            prompt += "\n";
        }

        // Intelligence Capabilities
        if (state.intelligenceCapabilities) {
            const intel = state.intelligenceCapabilities;
            prompt += "**Intelligence & Capabilities:**\n";
            
            if (intel.reasoning !== undefined) {
                const reasoningLevel = parseInt(intel.reasoning as string) < 30 ? "quick and practical" : parseInt(intel.reasoning as string) > 70 ? "deep and thorough" : "balanced";
                prompt += `- Reasoning approach: ${reasoningLevel}\n`;
            }
            if (intel.creativity !== undefined) {
                const creativityLevel = parseInt(intel.creativity as string) < 30 ? "conventional" : parseInt(intel.creativity as string) > 70 ? "innovative and creative" : "balanced";
                prompt += `- Creativity level: ${creativityLevel}\n`;
            }
            if (intel.memory) {
                prompt += "- Remember context from this conversation\n";
            }
            if (intel.expertise && Array.isArray(intel.expertise) && intel.expertise.length > 0) {
                prompt += `- Areas of expertise: ${intel.expertise.join(", ")}\n`;
            }
            prompt += "\n";
        }

        // Output Preferences
        if (state.outputPreferences) {
            const output = state.outputPreferences;
            prompt += "**Output Formatting:**\n";
            
            if (output.stepByStep) {
                prompt += "- Break down complex topics into step-by-step explanations\n";
            }
            if (output.examples) {
                prompt += "- Provide relevant examples when appropriate\n";
            }
            if (output.bulletPoints) {
                prompt += "- Use bullet points for lists and key information\n";
            }
            if (output.codeBlocks) {
                prompt += "- Format code in proper code blocks with syntax highlighting\n";
            }
            if (output.imageGen) {
                prompt += "- Suggest or describe visualizations when helpful\n";
            }
            prompt += "\n";
        }

        // Personal Information
        if (state.personalInfo) {
            const personal = state.personalInfo;
            const hasPersonalInfo = personal.name || personal.city || personal.occupation || personal.interests;
            
            if (hasPersonalInfo) {
                prompt += "**User Context:**\n";
                if (personal.name) {
                    prompt += `- User's name: ${personal.name}\n`;
                }
                if (personal.city) {
                    prompt += `- Location: ${personal.city}\n`;
                }
                if (personal.occupation) {
                    prompt += `- Occupation: ${personal.occupation}\n`;
                }
                if (personal.interests) {
                    prompt += `- Interests: ${personal.interests}\n`;
                }
                prompt += "\n";
            }
        }

        return prompt.trim();
    };

    const handleCustomizationSave = (state: Record<string, ConfigState>) => {
        setCustomizationState(state);
        setStateInitialized(true);
    };

    const handleCreatePrompt = async () => {
        setIsSaving(true);
        
        try {
            // If state hasn't been explicitly saved, it means the user hasn't clicked save
            // But we still want to create with an empty/default system message
            let systemMessage = "You are a helpful AI assistant.";
            let autoName = "AI Assistant";

            // If we have customization state, use it
            if (stateInitialized && Object.keys(customizationState).length > 0) {
                systemMessage = generateSystemMessage(customizationState);
                
                // Auto-generate name based on personality
                if (customizationState.communicationStyle?.personality) {
                    autoName = `${customizationState.communicationStyle.personality} Assistant`;
                }
            }

            // Use the prompt builder service
            await createPrompt({
                name: autoName,
                systemMessage,
                userMessage: "",
                variableDefaults: [],
            });
            
        } catch (error) {
            console.error('Error in handleCreatePrompt:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Customization Panel */}
            <div className="flex-1 overflow-auto">
                <AICustomizationPanel 
                    config={aiCustomizationConfig} 
                    onSave={handleCustomizationSave}
                />
            </div>

            {/* Create Button */}
            <div className="flex-shrink-0 p-3 border-t bg-muted/30">
                {!stateInitialized && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
                        Click "Save My Experience" above to capture your settings before creating
                    </p>
                )}
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
                            Create Prompt {stateInitialized ? "" : "(Default)"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

