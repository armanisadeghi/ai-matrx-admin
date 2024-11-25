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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui";

export const DropdownPresentation: PresentationComponent = (
    {
        trigger,
        content,
        variant = "default",
        className,
        config = defaultConfig,
        onOpenChange,
    }) => {
    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                {trigger}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className={getPresentationClasses(config, className)}
                {...getPresentationHandlers(config, onOpenChange)}
                align={config?.position === 'left' ? 'start' :
                       config?.position === 'right' ? 'end' : 'center'}
                side={config?.position === 'top' ? 'top' :
                      config?.position === 'bottom' ? 'bottom' : 'right'}
                sideOffset={4}
            >
                <div className={cn(
                    "matrx-content",
                    `matrx-density-${config?.density || "normal"}`
                )}>
                    {content}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

