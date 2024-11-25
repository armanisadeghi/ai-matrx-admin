import React from "react";
import {
    HoverCard,
    HoverCardTrigger,
    HoverCardContent,
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


export const HoverCardPresentation: PresentationComponent = (
    {
        trigger,
        content,
        className,
        config = defaultConfig,
        onOpenChange,
    }) => {
    return (
        <HoverCard onOpenChange={onOpenChange}>
            <HoverCardTrigger asChild>
                {trigger}
            </HoverCardTrigger>
            <HoverCardContent
                className={cn(
                    getPresentationClasses(config, className),
                    `matrx-density-${config?.density || "normal"}`
                )}
                {...getPresentationHandlers(config, onOpenChange)}
            >
                {content}
            </HoverCardContent>
        </HoverCard>
    );
};

