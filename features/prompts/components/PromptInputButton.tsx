import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";

interface PromptInputButtonProps {
    icon?: LucideIcon;
    text?: string;
    tooltip: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    variant?: "ghost" | "default";
    className?: string;
}

export function PromptInputButton({
    icon: Icon,
    text,
    tooltip,
    onClick,
    active = false,
    disabled = false,
    variant = "ghost",
    className = "",
}: PromptInputButtonProps) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={variant}
                        size="sm"
                        onClick={onClick}
                        disabled={disabled}
                        className={`h-7 p-0 ${text ? 'px-2' : 'w-7'} text-[11px] rounded-2xl transition-colors ${
                            active
                                ? "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                : "text-gray-400 dark:text-gray-600"
                        } ${className}`}
                        tabIndex={-1}
                    >
                        {Icon && <Icon className={`w-3 h-3 ${text ? 'mr-1' : ''}`} />}
                        {text}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

