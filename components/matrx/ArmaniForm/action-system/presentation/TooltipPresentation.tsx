import React from "react";
import {PresentationComponent} from "./types";
import {
    defaultConfig,
    getPresentationClasses,
    getPresentationHandlers,
    PresentationButtons,
    PresentationHeader
} from "./common";
import {cn} from "@/utils/cn";
import {
    Collapsible, ContextMenu, ContextMenuContent, ContextMenuTrigger,
    Dialog,
    DialogContent, DialogDescription, DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    Button
} from "@/components/ui";


export const TooltipPresentation: PresentationComponent = (
    {
        trigger,
        content,
        className,
        config = defaultConfig,
        onOpenChange,
    }) => {
    return (
        <Tooltip onOpenChange={onOpenChange}>
            <TooltipTrigger asChild>
                {trigger}
            </TooltipTrigger>
            <TooltipContent
                className={cn(
                    getPresentationClasses(config, className),
                    `matrx-density-${config?.density || "normal"}`
                )}
            >
                {content}
            </TooltipContent>
        </Tooltip>
    );
};
