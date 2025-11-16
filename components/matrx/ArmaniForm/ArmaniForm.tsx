"use client";

import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/styles/themes/utils";
import { EntityButton, EntitySearchInput } from "./field-components";
import { cardVariants, containerVariants, densityConfig, spacingConfig, getAnimationVariants } from "@/config/ui/entity-layout-config";
import {
    AccordionLayout,
    CarouselLayout,
    GridLayout,
    MasonryLayout,
    SectionsLayout,
    TabsLayout,
    TimelineLayout,
    TrialCardListLayout,
    TrialFieldTabsLayout,
    TrialFloatingLayout,
    TrialListGroupLayout,
    TrialSplitLayout,
    TrialStackedLayout,
    ZigzagLayout,
} from "./FormLayouts";
import SmartCrudButtons from "../Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import { FormColumnsOptions, FormDirectionOptions, GridColumnOptions, FormLayoutOptions } from "@/types/componentConfigTypes";
import { UnifiedLayoutProps } from "../Entity";
import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useRenderedFields } from "@/app/entities/hooks/form-related/useRenderedFields";

export interface FormState {
    [key: string]: any;
}

export type FormDensity = "normal" | "compact" | "comfortable";

const ArmaniForm: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const { activeRecordCrud, getEffectiveRecord } = useEntityCrud(entityKey);

    // Use the new utility to get all rendered fields
    const {
        nativeFields,
        relationshipFields,
        allFields: allRenderedFields,
        visibleFieldsInfo: {
            visibleNativeFields,
            visibleRelationshipFields,
            visibleFields,
            searchTerm,
            setSearchTerm,
            carouselActiveIndex,
            setCarouselActiveIndex,
            toggleField,
            selectAllFields,
            clearAllFields,
            isSearchEnabled,
            selectOptions,
        }
    } = useRenderedFields(unifiedLayoutProps);

    // Memoize configuration extraction to ensure reactivity to prop changes
    const formConfiguration = useMemo(() => {
        const dynamicLayoutOptions = unifiedLayoutProps.dynamicLayoutOptions;
        const formStyleOptions = dynamicLayoutOptions.formStyleOptions || {};
        const dynamicStyleOptions = unifiedLayoutProps.dynamicStyleOptions;
        
        return {
            isSinglePage: formStyleOptions.formIsSinglePage || false,
            isFullPage: formStyleOptions.formIsFullPage || false,
            columns: formStyleOptions.formColumns || (1 as FormColumnsOptions),
            layout: formStyleOptions.formLayout || ("grid" as FormLayoutOptions),
            direction: formStyleOptions.formDirection || ("row" as FormDirectionOptions),
            enableSearch: formStyleOptions.formEnableSearch || false,
            density: dynamicStyleOptions.density || "normal",
            animationPreset: dynamicStyleOptions.animationPreset || "smooth",
            variant: dynamicStyleOptions.variant || "default",
            size: dynamicStyleOptions.size || "default",
        };
    }, [
        unifiedLayoutProps.dynamicLayoutOptions,
        unifiedLayoutProps.dynamicStyleOptions
    ]);

    // Extract values from memoized configuration
    const {
        isSinglePage,
        isFullPage,
        columns,
        layout,
        direction,
        enableSearch,
        density,
        animationPreset,
        variant,
        size
    } = formConfiguration;

    // Extract other props that don't need memoization
    const unifiedCrudHandlers = unifiedLayoutProps.unifiedCrudHandlers;
    const className = unifiedLayoutProps.className;
    const containerSpacing = densityConfig[density].spacing;
    const densityStyles = spacingConfig[density];
    const currentStep = unifiedLayoutProps.unifiedStepHandlers?.currentStep;
    const onNextStep = unifiedLayoutProps.unifiedStepHandlers?.onNextStep;
    const onPrevStep = unifiedLayoutProps.unifiedStepHandlers?.onPrevStep;
    const formRef = React.useRef<HTMLDivElement>(null);

    // Memoize getGridColumns to avoid recreation on every render
    const getGridColumns = useMemo(() => 
        (columns: GridColumnOptions, fieldCount: number) => {
            console.log("columns", columns);
            if (typeof columns === "object" && "xs" in columns) {
                return `grid-cols-${columns.xs} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} xl:grid-cols-${columns.xl}`;
            }

            let colValue: number;

            if (columns === "auto") {
                if (fieldCount < 7) colValue = 1;
                else if (fieldCount <= 9) colValue = 2;
                else if (fieldCount <= 11) colValue = 3;
                else if (fieldCount <= 13) colValue = 4;
                else if (fieldCount <= 15) colValue = 5;
                else colValue = 6;
            } else {
                // Convert to number to handle both string and number inputs
                colValue = typeof columns === "string" ? parseInt(columns, 10) : columns;
            }

            console.log("colValue after conversion:", colValue);

            switch (colValue) {
                case 1:
                    return "grid-cols-1";
                case 2:
                    return "grid-cols-1 sm:grid-cols-2";
                case 3:
                    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
                case 4:
                    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
                case 5:
                    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
                case 6:
                    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";
                default:
                    return "grid-cols-1";
            }
        }, 
        [] // No dependencies needed since this is a pure function
    );

    const getFlexDirection = () => {
        switch (direction) {
            case "row":
                return "flex-row";
            case "row-reverse":
                return "flex-row-reverse";
            case "column":
                return "flex-col";
            case "column-reverse":
                return "flex-col-reverse";
            default:
                return "flex-row";
        }
    };

    // Memoize renderLayout to ensure it re-executes when configuration changes
    const renderedLayout = useMemo(() => {
        const commonProps = {
            filteredFields: allRenderedFields,
            renderField: null, // No longer needed - fields are already rendered
            density,
            densityStyles,
            containerSpacing,
            getGridColumns: () => getGridColumns(columns, allRenderedFields.length),
            getFlexDirection,
            animationPreset,
            containerVariants,
            cardVariants,
        };

        switch (layout) {
            case "sections":
                return <SectionsLayout {...commonProps} />;
            case "accordion":
                return <AccordionLayout {...commonProps} />;
            case "tabs":
                return <TabsLayout {...commonProps} />;
            case "masonry":
                return <MasonryLayout {...commonProps} />;
            case "carousel":
                return (
                    <CarouselLayout
                        {...commonProps}
                        carouselActiveIndex={carouselActiveIndex}
                        setCarouselActiveIndex={setCarouselActiveIndex}
                    />
                );
            case "timeline":
                return <TimelineLayout {...commonProps} />;
            case "TrialFloatingLayout":
                return <TrialFloatingLayout {...commonProps} />;
            case "TrialListGroupLayout":
                return <TrialListGroupLayout {...commonProps} />;
            case "TrialSplitLayout":
                return <TrialSplitLayout {...commonProps} />;
            case "TrialCardListLayout":
                return <TrialCardListLayout {...commonProps} />;
            case "ZigzagLayout":
                return <ZigzagLayout {...commonProps} />;
            case "TrialStackedLayout":
                return <TrialStackedLayout {...commonProps} />;
            case "TrialFieldTabsLayout":
                return <TrialFieldTabsLayout {...commonProps} />;
            case "grid":
            default:
                return <GridLayout {...commonProps} />;
        }
    }, [
        allRenderedFields,
        density,
        densityStyles,
        containerSpacing,
        columns,
        layout,
        direction,
        animationPreset,
        carouselActiveIndex,
        setCarouselActiveIndex
    ]);

    return (
        <motion.div
            ref={formRef}
            className={cn(
                "bg-card rounded-lg",
                isFullPage ? "w-full h-full" : "max-w-md mx-auto mt-2 shadow-xl",
                densityConfig[density].padding.md,
                className
            )}
            variants={containerVariants[animationPreset]}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    unifiedCrudHandlers.handleUpdate();
                }}
                className={cn("h-full", densityStyles.container)}
            >

                <div className={cn(isFullPage ? "h-[calc(100%-4rem)] overflow-y-auto" : "", densityStyles.section)}>
                    <SmartCrudButtons
                        entityKey={entityKey}
                        options={{
                            allowCreate: true,
                            allowEdit: true,
                            allowDelete: true,
                        }}
                        layout={{
                            buttonLayout: "row",
                            buttonSize: "sm",
                        }}
                        className="mb-4"
                    />

                    {isSinglePage ? (
                        renderedLayout
                    ) : (
                        <>
                            {allRenderedFields.length > 0 && currentStep < allRenderedFields.length && (
                                <>
                                    <motion.h2
                                        className={cn(
                                            "font-bold mb-4 text-foreground",
                                            isFullPage ? "text-3xl" : "text-2xl",
                                            densityConfig[density].fontSize
                                        )}
                                        variants={cardVariants[animationPreset]}
                                    >
                                        Field {currentStep + 1}
                                    </motion.h2>

                                    <AnimatePresence mode="sync">
                                        <motion.div
                                            key={currentStep}
                                            variants={getAnimationVariants(animationPreset)}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                        >
                                            {allRenderedFields[currentStep]}
                                        </motion.div>
                                    </AnimatePresence>
                                </>
                            )}
                        </>
                    )}

                    {allRenderedFields.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No fields available to display
                        </div>
                    )}
                </div>

                <motion.div className={cn("flex justify-between", densityStyles.gap)} variants={cardVariants[animationPreset]}>
                    {/* Button components with density-aware styling */}
                    {!isSinglePage && allRenderedFields.length > 0 && (
                        <EntityButton
                            onClick={() => {
                                if (currentStep > 0) onPrevStep();
                            }}
                            disabled={currentStep === 0}
                            className={cn("space-y-6 bg-secondary text-secondary-foreground", densityStyles.buttonSize)}
                        >
                            Previous
                        </EntityButton>
                    )}
                    {(isSinglePage || (allRenderedFields.length > 0 && currentStep === allRenderedFields.length - 1)) ? (
                        <EntityButton type="submit" className="bg-primary text-primary-foreground">
                            Submit
                        </EntityButton>
                    ) : (
                        allRenderedFields.length > 0 && (
                            <EntityButton
                                onClick={() => {
                                    if (currentStep < allRenderedFields.length - 1) onNextStep();
                                }}
                                className="bg-primary text-primary-foreground"
                            >
                                Next
                            </EntityButton>
                        )
                    )}
                </motion.div>
            </form>

            {!isSinglePage && allRenderedFields.length > 0 && (
                <motion.div
                    className={cn("mt-4 text-muted-foreground", densityConfig[density].fontSize)}
                    variants={cardVariants[animationPreset]}
                >
                    Step {currentStep + 1} of {allRenderedFields.length}
                </motion.div>
            )}
        </motion.div>
    );
};

export default ArmaniForm;