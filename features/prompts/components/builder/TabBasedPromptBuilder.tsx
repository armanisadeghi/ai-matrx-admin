/**
 * Tab-Based Prompt Builder Wrapper
 * 
 * Wraps the experimental tab-based builder with prompt creation functionality
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { usePromptBuilder } from "@/features/prompts/services/promptBuilderService";
import { PromptBuilderProvider, usePromptBuilder as useBuilderContext } from "@/features/prompts/components/tabbed-builder/PromptBuilderContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskTab } from "@/features/prompts/components/tabbed-builder/TaskTab";
import { ContextTab } from "@/features/prompts/components/tabbed-builder/ContextTab";
import { ToneTab } from "@/features/prompts/components/tabbed-builder/ToneTab";
import { FormatTab } from "@/features/prompts/components/tabbed-builder/FormatTab";
import { KnowledgeTab } from "@/features/prompts/components/tabbed-builder/KnowledgeTab";
import { ExamplesTab } from "@/features/prompts/components/tabbed-builder/ExamplesTab";
import { ConstraintsTab } from "@/features/prompts/components/tabbed-builder/ConstraintsTab";
import { AudienceTab } from "@/features/prompts/components/tabbed-builder/AudienceTab";
import { EvaluationTab } from "@/features/prompts/components/tabbed-builder/EvaluationTab";
import { MotivationTab } from "@/features/prompts/components/tabbed-builder/MotivationTab";
import { EmphasisTab } from "@/features/prompts/components/tabbed-builder/EmphasisTab";
import { GenericTextareaTab } from "@/features/prompts/components/tabbed-builder/GenericTextareaTab";
import { PreviewTab } from "@/features/prompts/components/tabbed-builder/PreviewTab";
import { Suspense } from "react";

interface TabBasedPromptBuilderProps {
    onClose: () => void;
}

// Placeholder tab for unimplemented tabs
const PlaceholderTab: React.FC<{ tabId: string }> = ({ tabId }) => (
    <div className="p-4 text-gray-600 dark:text-gray-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-md">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Coming Soon</h3>
        <p>The "{tabId}" tab is not yet implemented.</p>
    </div>
);

// Builder content that uses the context
function BuilderContent({ onClose }: TabBasedPromptBuilderProps) {
    const router = useRouter();
    const { createPrompt } = usePromptBuilder(router, onClose);
    const { generateFinalPrompt, activeTab, setActiveTab, allTabs } = useBuilderContext();
    const [isSaving, setIsSaving] = useState(false);

    const handleCreatePrompt = async () => {
        setIsSaving(true);
        
        try {
            // Generate the final system message from the builder
            const systemMessage = generateFinalPrompt();

            // Use the prompt builder service with auto-generated name
            await createPrompt({
                name: "Tab-Built Prompt",
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

    // Function to render the structure and specialInstructions tabs
    const renderGenericTab = (id: string, tabNumber: number) => {
        return (
            <GenericTextareaTab
                id={id}
                tabNumber={tabNumber}
                placeholder={`Enter ${id} details here...`}
                label={id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1')}
            />
        );
    };

    // Function to render the appropriate tab based on the ID
    const renderTabContent = (tab: any) => {
        const { id, tabNumber } = tab;

        switch (id) {
            case 'task':
                return <TaskTab />;
            case 'context':
                return <ContextTab />;
            case 'tone':
                return <ToneTab />;
            case 'format':
                return <FormatTab />;
            case 'knowledge':
                return <KnowledgeTab />;
            case 'examples':
                return <ExamplesTab />;
            case 'constraints':
                return <ConstraintsTab />;
            case 'audience':
                return <AudienceTab />;
            case 'evaluation':
                return <EvaluationTab />;
            case 'motivation':
                return <MotivationTab />;
            case 'emphasis':
                return <EmphasisTab />;
            case 'structure':
                return renderGenericTab('structure', tabNumber);
            case 'specialInstructions':
                return renderGenericTab('specialInstructions', tabNumber);
            case 'preview':
                return <PreviewTab />;
            default:
                return <PlaceholderTab tabId={id} />;
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Builder Content */}
            <div className="flex-1 overflow-auto p-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                        <TabsList className="flex flex-wrap h-auto justify-start bg-transparent">
                            {allTabs.map((tab) => (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="flex items-center px-3 py-1.5 mx-1 my-1 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-gray-700 dark:text-gray-300 rounded-md data-[state=active]:shadow-sm text-xs"
                                >
                                    <span className="mr-1.5 text-sm">{tab.icon}</span>
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {allTabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id} className="mt-0">
                            <Suspense fallback={<div className="p-4 animate-pulse">Loading...</div>}>
                                {renderTabContent(tab)}
                            </Suspense>
                        </TabsContent>
                    ))}
                </Tabs>
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

// Main wrapper with provider
export default function TabBasedPromptBuilder({ onClose }: TabBasedPromptBuilderProps) {
    return (
        <PromptBuilderProvider>
            <BuilderContent onClose={onClose} />
        </PromptBuilderProvider>
    );
}

