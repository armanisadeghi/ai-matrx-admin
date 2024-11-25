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


export const InlinePresentation: PresentationComponent = (
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
    // Since inline is always "open", we notify parent on mount
    React.useEffect(() => {
        onOpenChange?.(true);
        return () => onOpenChange?.(false);
    }, [onOpenChange]);

    return (
        <div
            className={cn(
                getPresentationClasses(config, className),
                "inline-presentation"
            )}
        >
            {trigger}
            <div className={cn(
                "matrx-content",
                "mt-2",
                `matrx-density-${config?.density || "normal"}`
            )}>
                <PresentationHeader
                    title={title}
                    description={description}
                    helpSource={helpSource}
                />
                {content}
                {controls && (
                    <PresentationButtons
                        controls={controls}
                        variant={variant}
                        onOpenChange={onOpenChange}
                    />
                )}
            </div>
        </div>
    );
};
