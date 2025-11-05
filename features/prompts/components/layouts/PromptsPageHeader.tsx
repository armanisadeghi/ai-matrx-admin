"use client";

import { useState } from "react";
import { PageSpecificHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { Button } from "@/components/ui/button";
import { Plus, LayoutPanelTop, MoreVertical, Upload, Wand2 } from "lucide-react";
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

export function PromptsPageHeader() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);

    if (isMobile) {
        return (
            <PageSpecificHeader>
                <div className="flex items-center justify-between w-full gap-2">
                    {/* Left - Title */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FaIndent className="h-5 w-5 text-primary flex-shrink-0" />
                        <h1 className="text-base font-bold text-foreground truncate">
                            Prompts
                        </h1>
                    </div>

                    {/* Right - Quick Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* New Button - Primary action */}
                        <Link href="/ai/prompts/new">
                            <Button size="sm" className="h-8 px-3">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </Link>

                        {/* More Actions Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                    <Link href="/ai/prompts/templates" className="flex items-center cursor-pointer">
                                        <LayoutPanelTop className="h-4 w-4 mr-2" />
                                        <span>Templates</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                                    <Upload className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                                    <span>Import</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsGenerateOpen(true)}>
                                    <Wand2 className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                                    <span>Generate with AI</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
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
                <PromptGenerator
                    isOpen={isGenerateOpen}
                    onClose={() => setIsGenerateOpen(false)}
                />
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
            <PromptGenerator
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
            />
        </PageSpecificHeader>
    );
}

