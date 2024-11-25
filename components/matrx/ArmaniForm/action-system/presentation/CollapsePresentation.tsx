import React from "react";
import {
    Collapsible,
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

export const CollapsePresentation: PresentationComponent = (
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
        <div className={getPresentationClasses(config, className)}>
            <div onClick={() => onOpenChange?.(true)}>
                {trigger}
            </div>
            <Collapsible
                open={true}
                onOpenChange={onOpenChange}
            >
                <PresentationHeader
                    title={title}
                    description={description}
                    helpSource={helpSource}
                />
                <div className={cn(
                    "matrx-content",
                    `matrx-density-${config?.density || "normal"}`
                )}>
                    {content}
                </div>
                <PresentationButtons
                    controls={controls}
                    variant={variant}
                    onOpenChange={onOpenChange}
                />
            </Collapsible>
        </div>
    );
};


