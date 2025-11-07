"use client";

import { useState } from "react";
import { X, Plus, Upload, Wrench, Wand2, LayoutPanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PromptImporter } from "@/features/prompts";
import { PromptGenerator } from "./PromptGenerator";
import { PromptBuilderModal } from "./PromptBuilderModal";
import { useRouter } from "next/navigation";

interface NewPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ActionButtonProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
    onClick: () => void;
}

function ActionButton({ icon, title, description, gradient, onClick }: ActionButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden w-full rounded-xl p-4 text-left transition-all",
                "bg-gradient-to-br hover:scale-[1.02] active:scale-[0.98]",
                "border border-border/50 hover:border-border",
                "shadow-md hover:shadow-lg",
                gradient
            )}
        >
            <div className="relative z-10 flex items-center gap-3">
                <div className="flex-shrink-0 p-2.5 rounded-lg bg-background/90 backdrop-blur-sm shadow-sm">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground">
                        {title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {description}
                    </p>
                </div>
            </div>
        </button>
    );
}

export function NewPromptModal({ isOpen, onClose }: NewPromptModalProps) {
    const router = useRouter();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [isBuildOpen, setIsBuildOpen] = useState(false);

    if (!isOpen && !isImportOpen && !isGenerateOpen && !isBuildOpen) return null;

    const handleNewManual = () => {
        onClose();
        router.push("/ai/prompts/new");
    };

    const handleImport = () => {
        onClose();
        setIsImportOpen(true);
    };

    const handleBuild = () => {
        onClose();
        setIsBuildOpen(true);
    };

    const handleGenerate = () => {
        onClose();
        setIsGenerateOpen(true);
    };

    const handleTemplates = () => {
        onClose();
        router.push("/ai/prompts/templates");
    };

    const handleImportClose = () => {
        setIsImportOpen(false);
    };

    const handleImportSuccess = (promptId: string) => {
        setIsImportOpen(false);
        router.refresh();
    };

    return (
        <>
            {/* Main Modal */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-background/80 backdrop-blur-md z-50"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <div className="fixed inset-x-0 bottom-0 z-50 pb-safe">
                        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 max-w-[1800px] pb-4">
                            <div className="bg-background/95 backdrop-blur-xl rounded-t-3xl border border-b-0 border-border/50 shadow-2xl">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
                                    <h2 className="text-lg font-bold text-foreground">
                                        Create New Prompt
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="h-8 w-8"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>

                                {/* Action Buttons */}
                                <div className="p-4 space-y-2.5">
                                    <ActionButton
                                        icon={<Plus className="h-5 w-5 text-primary" />}
                                        title="Create Manually"
                                        description="Start from scratch and write your custom prompt"
                                        gradient="from-primary/5 to-primary/10"
                                        onClick={handleNewManual}
                                    />

                                    <ActionButton
                                        icon={<Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
                                        title="Generate with AI"
                                        description="Let AI create a prompt based on your exact requirements"
                                        gradient="from-purple-500/5 to-blue-500/10"
                                        onClick={handleGenerate}
                                    />

                                    <ActionButton
                                        icon={<Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />}
                                        title="Build Interactively"
                                        description="Use the prompt builder for a guided experience and customize it"
                                        gradient="from-green-500/5 to-emerald-500/10"
                                        onClick={handleBuild}
                                    />

                                    <ActionButton
                                        icon={<Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                                        title="Import Prompt"
                                        description="Import an existing prompt from a JSON file and customize it"
                                        gradient="from-blue-500/5 to-cyan-500/10"
                                        onClick={handleImport}
                                    />

                                    <ActionButton
                                        icon={<LayoutPanelTop className="h-5 w-5 text-secondary-foreground" />}
                                        title="Use Template"
                                        description="Start with a pre-built template from the templates library"
                                        gradient="from-secondary/5 to-accent/10"
                                        onClick={handleTemplates}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Sub-modals */}
            <PromptImporter
                isOpen={isImportOpen}
                onClose={handleImportClose}
                onImportSuccess={handleImportSuccess}
            />
            <PromptBuilderModal
                isOpen={isBuildOpen}
                onClose={() => setIsBuildOpen(false)}
            />
            <PromptGenerator
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
            />
        </>
    );
}

