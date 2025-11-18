"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Edit3, Play, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptModeNavigationProps {
    promptId: string;
    promptName: string;
    currentMode: "edit" | "run";
    onPromptNameChange?: (value: string) => void; // Optional: for edit mode
}

export function PromptModeNavigation({ promptId, promptName, currentMode, onPromptNameChange }: PromptModeNavigationProps) {
    const router = useRouter();

    const handleNavigation = (destination: "list" | "edit" | "run") => {
        if (destination === "list") {
            router.push('/ai/prompts');
        } else if (destination === "edit" && currentMode !== "edit") {
            router.push(`/ai/prompts/edit/${promptId}`);
        } else if (destination === "run" && currentMode !== "run") {
            router.push(`/ai/prompts/run/${promptId}`);
        }
    };

    return (
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            {/* 3-icon navigation group */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Back to list */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation("list")}
                    className={cn(
                        "h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                        "transition-colors"
                    )}
                    title="Back to prompts"
                >
                    <LayoutGrid className="w-4 h-4" />
                </Button>

                {/* Edit mode */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation("edit")}
                    className={cn(
                        "h-9 w-9 p-0 transition-colors",
                        currentMode === "edit"
                            ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title="Edit mode"
                >
                    <Edit3 className="w-4 h-4" />
                </Button>

                {/* Run mode */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation("run")}
                    className={cn(
                        "h-9 w-9 p-0 transition-colors",
                        currentMode === "run"
                            ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title="Run mode"
                >
                    <Play className="w-4 h-4" />
                </Button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-border flex-shrink-0" />

            {/* Prompt name - editable in edit mode, static in run mode */}
            {currentMode === "edit" && onPromptNameChange ? (
                <input
                    type="text"
                    value={promptName}
                    onChange={(e) => onPromptNameChange(e.target.value)}
                    className="text-sm font-medium bg-transparent border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 max-w-[200px] xl:max-w-[300px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Untitled prompt"
                />
            ) : (
                <h1 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {promptName || "Untitled Prompt"}
                </h1>
            )}
        </div>
    );
}

