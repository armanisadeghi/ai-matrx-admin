import {
     DialogDescription, DialogFooter,
    DialogHeader,
    DialogTitle,
    Button
} from "@/components/ui";
import React from "react";
import {PresentationConfig, PresentationControls} from "./types";
import { cn } from '@/utils';
import {HelpPanel} from "@/components/matrx/ArmaniForm/field-components/help-text/HelpPanel";

export const defaultConfig: PresentationConfig = {
    allowBackgroundInteraction: false,
    preventScroll: true,
    closeOnOutsideClick: true,
    closeOnEscape: true,
    density: "normal",
    animationPreset: "smooth",
    size: "default",
    position: "center"
};

export const getPresentationClasses = (
    config: PresentationConfig,
    className?: string
) => {
    const {
        density = "normal",
        animationPreset = "smooth",
        size = "default",
        position = "center",
    } = config;

    return cn(
        `matrx-density-${density}`,
        `matrx-animation-${animationPreset}`,
        `matrx-size-${size}`,
        `matrx-position-${position}`,
        className
    );
};

// Utility for handling presentation interactions
export const getPresentationHandlers = (
    config: PresentationConfig,
    onOpenChange?: (isOpen: boolean) => void
) => ({
    onPointerDownOutside: (e: any) => {
        if (!config.allowBackgroundInteraction) {
            e.preventDefault();
        }
        if (config.closeOnOutsideClick) {
            onOpenChange?.(false);
        }
    },
    onEscapeKeyDown: (e: any) => {
        if (config.closeOnEscape) {
            onOpenChange?.(false);
        } else {
            e.preventDefault();
        }
    },
});

// Optional Header Component - use when applicable
export const PresentationHeader = (
    {
        title,
        description,
        helpSource,
    }: {
        title?: string;
        description?: string;
        helpSource?: string;
    }) => {
    if (!title && !description && !helpSource) return null;

    return (
        <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
            {helpSource && <HelpPanel source={helpSource} className="mt-2"/>}
        </DialogHeader>
    );
};

// Controls Component - use when applicable
export const PresentationButtons = (
    {
        controls,
        variant,
        onOpenChange,
    }: {
        controls?: PresentationControls;
        variant?: string;
        onOpenChange?: (isOpen: boolean) => void;
    }) => {
    if (!controls) return null;

    return (
        <DialogFooter>
            {controls.showClose && (
                <Button
                    variant="ghost"
                    onClick={() => onOpenChange?.(false)}
                >
                    Close
                </Button>
            )}
            {controls.showCancel && (
                <Button
                    variant="ghost"
                    onClick={controls.onCancel}
                >
                    Cancel
                </Button>
            )}
            {controls.showSave && (
                <Button
                    variant={"primary"}
                    onClick={controls.onSave}
                >
                    Save
                </Button>
            )}
            {controls.showConfirm && (
                <Button
                    variant={"secondary"}
                    onClick={controls.onConfirm}
                >
                    Confirm
                </Button>
            )}
        </DialogFooter>
    );
};
