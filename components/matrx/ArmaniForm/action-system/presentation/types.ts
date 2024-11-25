import React from "react";
import { AnimationPreset, ComponentDensity } from "@/types/componentConfigTypes";
import { MatrxVariant } from "@/components/matrx/ArmaniForm/field-components/types";

export type PresentationSize = 'sm' | 'default' | 'lg' | 'xl' | 'full';
export type PresentationPosition = 'left' | 'right' | 'top' | 'bottom' | 'center';

export interface PresentationConfig {
    allowBackgroundInteraction?: boolean;
    preventScroll?: boolean;
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    size?: PresentationSize;
    position?: PresentationPosition;
}

export interface PresentationControls {
    showClose?: boolean;
    showSave?: boolean;
    showCancel?: boolean;
    showConfirm?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
    onConfirm?: () => void;
}

export interface PresentationProps {
    trigger: React.ReactNode;
    content: React.ReactNode;
    variant?: MatrxVariant;

    title?: string;
    description?: string;
    helpSource?: string;

    className?: string;

    config?: PresentationConfig;
    controls?: PresentationControls;

    onOpenChange?: (isOpen: boolean) => void;
}

export type PresentationComponent = (props: PresentationProps) => React.ReactNode;

