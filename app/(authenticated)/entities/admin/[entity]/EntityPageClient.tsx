// app\(authenticated)\entities\admin\[entity]\EntityPageClient.tsx
"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import ArmaniLayout from "@/components/matrx/Entity/prewired-components/layouts/ArmaniLayout";
import { cn } from "@/lib/utils";
import { UnifiedLayoutProps, UnifiedLayoutHandlers } from "@/components/matrx/Entity/prewired-components/layouts/types";
import { EntityFormType, QuickReferenceComponentType, PageLayoutOptions, ComponentDensity } from "@/types/componentConfigTypes";
import { EntityKeys } from "@/types/entityTypes";
import {
    DEFAULT_DYNAMIC_STYLE_OPTIONS,
    DEFAULT_FORM_COMPONENT_OPTIONS,
    DEFAULT_FORM_STYLE_OPTIONS,
    DEFAULT_INLINE_ENTITY_OPTIONS,
    DEFAULT_RESIZABLE_LAYOUT_OPTIONS,
    DEFAULT_SELECT_COMPONENT_OPTIONS,
} from "@/app/entities/layout/configs";

export function getUnifiedLayoutProps(options?: {
    entityKey?: EntityKeys;
    formComponent?: EntityFormType;
    quickReferenceType?: QuickReferenceComponentType | string;
    formLayoutType?: PageLayoutOptions;
    density?: ComponentDensity;
    isExpanded?: boolean;
    isFullScreen?: boolean;
    handlers?: UnifiedLayoutHandlers;
    animationPreset?: string;
    allowEntitySelection?: boolean;
}): UnifiedLayoutProps {
    const {
        entityKey = "registeredFunction",
        formComponent = "DEFAULT",
        quickReferenceType = "cards",
        formLayoutType = "split",
        density = "normal",
        isExpanded = false,
        isFullScreen = false,
        handlers = {},
        animationPreset,
        allowEntitySelection = false,
    } = options || {};

    return {
        layoutState: {
            selectedEntity: entityKey,
            isExpanded: isExpanded,
            selectHeight: 0,
            isFullScreen: isFullScreen,
        },
        handlers: handlers,
        dynamicStyleOptions: {
            ...DEFAULT_DYNAMIC_STYLE_OPTIONS,
            density: density,
            ...(animationPreset && { animationPreset: animationPreset as any }),
        },
        dynamicLayoutOptions: {
            componentOptions: {
                ...DEFAULT_FORM_COMPONENT_OPTIONS,
                quickReferenceType: quickReferenceType as QuickReferenceComponentType,
                formLayoutType: formLayoutType as PageLayoutOptions,
                allowEntitySelection: false,
            },
            formStyleOptions: DEFAULT_FORM_STYLE_OPTIONS,
            inlineEntityOptions: DEFAULT_INLINE_ENTITY_OPTIONS,
        },
        resizableLayoutOptions: DEFAULT_RESIZABLE_LAYOUT_OPTIONS,
        selectComponentOptions: DEFAULT_SELECT_COMPONENT_OPTIONS,
        formComponent: formComponent,
    };
}

// Entity-specific configurations - easily customizable and expandable
const ENTITY_CONFIGS = {
    registeredFunction: {
        entityKey: "registeredFunction" as EntityKeys,
        formComponent: "DEFAULT" as EntityFormType,
        quickReferenceType: "dynamic" as QuickReferenceComponentType,
        formLayoutType: "split" as PageLayoutOptions,
        density: "normal" as ComponentDensity,
        isExpanded: false,
        isFullScreen: false,
        animationPreset: "subtle",
    },
    
    arg: {
        entityKey: "arg" as EntityKeys,
        formComponent: "ARMANI" as EntityFormType,
        quickReferenceType: "dynamic" as QuickReferenceComponentType,
        formLayoutType: "sideBySide" as PageLayoutOptions,
        density: "normal" as ComponentDensity,
        isExpanded: false,
        isFullScreen: false,
    },
    
    workflow: {
        entityKey: "workflow" as EntityKeys,
        formComponent: "STANDARD" as EntityFormType,
        quickReferenceType: "select" as QuickReferenceComponentType,
        formLayoutType: "stacked" as PageLayoutOptions,
        density: "normal" as ComponentDensity,
        isExpanded: false,
        isFullScreen: false,
        animationPreset: "subtle",
    },
    
    aiModel: {
        entityKey: "aiModel" as EntityKeys,
        formComponent: "RECORD_SELECT" as EntityFormType,
        quickReferenceType: "select" as QuickReferenceComponentType,
        formLayoutType: "stacked" as PageLayoutOptions,
        density: "normal" as ComponentDensity,
        isExpanded: false,
        isFullScreen: false,
        animationPreset: "subtle",
    },
    
    compiledRecipe: {
        entityKey: "compiledRecipe" as EntityKeys,
        formComponent: "DEFAULT" as EntityFormType,
        quickReferenceType: "dynamic" as QuickReferenceComponentType,
        formLayoutType: "resizable" as PageLayoutOptions,
        density: "normal" as ComponentDensity,
        isExpanded: false,
        isFullScreen: false,
    },
    
    // Add more entity configs here as needed...
    // Each config is completely independent and easily customizable
} as const;

// Generic fallback configuration for entities without custom configs
const GENERIC_ENTITY_CONFIG = {
    formComponent: "DEFAULT" as EntityFormType,
    quickReferenceType: "dynamic" as QuickReferenceComponentType,
    formLayoutType: "newSplit" as PageLayoutOptions,
    density: "normal" as ComponentDensity,
    isExpanded: false,
    isFullScreen: false,
};

/**
 * Gets the unified layout props for a given entity
 * Uses custom config if available, otherwise falls back to generic config
 * This function is pure and deterministic - no side effects or re-renders
 */
function getEntityUnifiedLayoutProps(entityKey: EntityKeys): UnifiedLayoutProps {
    const entityConfig = ENTITY_CONFIGS[entityKey as keyof typeof ENTITY_CONFIGS];
    
    if (entityConfig) {
        // Use custom config if it exists
        return getUnifiedLayoutProps(entityConfig);
    }
    
    // Fall back to generic config
    return getUnifiedLayoutProps({
        entityKey: entityKey,
        ...GENERIC_ENTITY_CONFIG,
    });
}

const EntityPageLayout = ({ entityKey }: { entityKey: EntityKeys }) => {
    // Handle case where entityKey might not be available yet (async route params)
    if (!entityKey) {
        return (
            <div className="h-full w-full bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading entity configuration...</p>
                </div>
            </div>
        );
    }

    // useMemo with entityKey dependency ensures this updates when entityKey changes
    // This is essential for dynamic routes where entityKey comes from params
    const unifiedProps = useMemo(() => getEntityUnifiedLayoutProps(entityKey), [entityKey]);

    return (
        <div className="h-full w-full bg-background">
            <motion.div className={cn("relative w-full h-full", unifiedProps.layoutState.isFullScreen && "fixed inset-0 z-50")} layout>
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-hidden">
                        <ArmaniLayout unifiedLayoutProps={unifiedProps} className="h-full" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EntityPageLayout;
