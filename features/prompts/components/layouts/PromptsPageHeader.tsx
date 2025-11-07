"use client";

import { useState } from "react";
import { PageSpecificHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { Button } from "@/components/ui/button";
import { Plus, LayoutPanelTop, MoreVertical, Upload, Wand2, Wrench } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaIndent } from "react-icons/fa6";
import { PromptImporter } from "@/features/prompts";
import { PromptGenerator } from "../actions/PromptGenerator";
import { PromptBuilderModal } from "../actions/PromptBuilderModal";

export function PromptsPageHeader() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [isBuildOpen, setIsBuildOpen] = useState(false);

    if (isMobile) {
        return (
            <PageSpecificHeader>
                <div className="flex items-center justify-center w-full">
                    <div className="flex items-center gap-2">
                        <FaIndent className="h-5 w-5 text-primary flex-shrink-0" />
                        <h1 className="text-base font-bold text-foreground">
                            Prompts
                        </h1>
                    </div>
                </div>
            </PageSpecificHeader>
        );
    }

    // Desktop - Show all actions centered
    return (
        <PageSpecificHeader>
            <div className="flex items-center justify-center w-full gap-2">
                <Button
                    onClick={() => setIsImportOpen(true)}
                    variant="outline"
                    size="sm"
                    className="h-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                >
                    <Upload className="h-3.5 w-3.5" />
                    Import
                </Button>
                <Button
                    onClick={() => setIsBuildOpen(true)}
                    variant="outline"
                    size="sm"
                    className="h-8 border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
                >
                    <Wrench className="h-3.5 w-3.5" />
                    Build
                </Button>
                <Button
                    onClick={() => setIsGenerateOpen(true)}
                    size="sm"
                    className="h-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                    <Wand2 className="h-3.5 w-3.5" />
                    Generate
                </Button>
                <Link href="/ai/prompts/templates">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-secondary hover:bg-secondary/10 text-secondary-foreground"
                    >
                        <LayoutPanelTop className="h-3.5 w-3.5" />
                        Templates
                    </Button>
                </Link>
                <Link href="/ai/prompts/new">
                    <Button size="sm" className="h-8">
                        <Plus className="h-3.5 w-3.5" />
                        New
                    </Button>
                </Link>
            </div>

            {/* Modals */}
            <PromptImporter
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onImportSuccess={(promptId) => {
                    setIsImportOpen(false);
                    router.refresh();
                }}
            />
            <PromptBuilderModal
                isOpen={isBuildOpen}
                onClose={() => setIsBuildOpen(false)}
            />
            <PromptGenerator
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
            />
        </PageSpecificHeader>
    );
}

