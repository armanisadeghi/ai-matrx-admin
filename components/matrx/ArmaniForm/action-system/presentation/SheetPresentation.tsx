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
import {EntitySheet} from "@/components/matrx/ArmaniForm/field-components/EntitySheet";

export const SheetPresentation: PresentationComponent = (
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
        <EntitySheet
            trigger={trigger}
            onOpenChange={onOpenChange}
            position={config?.position}
            size={config?.size}
            title={
                <PresentationHeader
                    title={title}
                    description={description}
                    helpSource={helpSource}
                />
            }
            className={getPresentationClasses(config, className)}
            {...getPresentationHandlers(config, onOpenChange)}
        >
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
        </EntitySheet>
    );
};
