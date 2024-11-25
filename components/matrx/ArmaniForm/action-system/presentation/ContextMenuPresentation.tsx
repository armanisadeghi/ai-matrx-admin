import React from "react";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
} from "@/components/ui";
import {PresentationComponent} from "./types";
import {cn} from "@/lib/utils";
import {
    getPresentationClasses,
    getPresentationHandlers,
    PresentationHeader,
    PresentationButtons,
    defaultConfig,
} from "./common";


export const ContextMenuPresentation: PresentationComponent = (
    {
        trigger,
        content,
        className,
        config = defaultConfig,
        onOpenChange,
    }) => {
    return (
        <ContextMenu onOpenChange={onOpenChange}>
            <ContextMenuTrigger asChild>
                {trigger}
            </ContextMenuTrigger>
            <ContextMenuContent
                className={cn(
                    getPresentationClasses(config, className),
                    `matrx-density-${config?.density || "normal"}`
                )}
                {...getPresentationHandlers(config, onOpenChange)}
            >
                {content}
            </ContextMenuContent>
        </ContextMenu>
    );
};
