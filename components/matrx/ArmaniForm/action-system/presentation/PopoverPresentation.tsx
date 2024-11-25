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
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";

export const PopoverPresentation: PresentationComponent = (
    {
        trigger,
        content,
        variant = "default",
        title,
        description,
        helpSource,
        className,
        config = defaultConfig,
        controls,
        onOpenChange,
    }) => {
    return (
        <Popover onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                {trigger}
            </PopoverTrigger>
            <PopoverContent
                className={getPresentationClasses(config, className)}
                {...getPresentationHandlers(config, onOpenChange)}
                align={config?.position === 'left' ? 'start' :
                       config?.position === 'right' ? 'end' : 'center'}
                side={config?.position === 'top' ? 'top' :
                      config?.position === 'bottom' ? 'bottom' :
                      config?.position === 'left' ? 'left' :
                      config?.position === 'right' ? 'right' : 'bottom'}
            >
                <PresentationHeader
                    title={title}
                    description={description}
                    helpSource={helpSource}
                />

                <div className={cn(
                    "matrx-content",
                    `matrx-density-${config.density || "normal"}`
                )}>
                    {content}
                </div>

                <PresentationButtons
                    controls={controls}
                    variant={variant}
                    onOpenChange={onOpenChange}
                />
            </PopoverContent>
        </Popover>
    );
};
