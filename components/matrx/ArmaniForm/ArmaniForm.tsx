"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useFieldVisibility } from "@/app/entities/hooks/form-related/useFieldVisibility";
import { useFieldRenderer } from "@/app/entities/hooks/form-related/useFieldRenderer";
import { useFieldConfiguration } from "@/app/entities/hooks/form-related/useFieldConfiguration";

export interface FormState {
    [key: string]: any;
}

export type FormDensity = "normal" | "compact" | "comfortable";

const ArmaniForm: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const { activeRecordCrud, getEffectiveRecord } = useEntityCrud(entityKey);
    const recordData = activeRecordCrud.recordData;

    const {
        visibleFields,
        visibleNativeFields,
        visibleRelationshipFields,
        searchTerm,
        setSearchTerm,
        carouselActiveIndex,
        setCarouselActiveIndex,
        toggleField,
        selectAllFields,
        clearAllFields,
        isSearchEnabled,
        selectOptions,
    } = useFieldVisibility(entityKey, unifiedLayoutProps);

    // Get field configuration for search placeholders
    const { allowedFields, fieldDisplayNames } = useFieldConfiguration(entityKey, unifiedLayoutProps);

    const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer(
        entityKey, 
        activeRecordCrud.recordId, 
        unifiedLayoutProps
    );

    const dynamicLayoutOptions = unifiedLayoutProps.dynamicLayoutOptions;
    const formStyleOptions = dynamicLayoutOptions.formStyleOptions || {};
    const isSinglePage = formStyleOptions.formIsSinglePage || false;
    const isFullPage = formStyleOptions.formIsFullPage || false;
    const columns = formStyleOptions.formColumns || (1 as FormColumnsOptions);
    const layout = formStyleOptions.formLayout || ("grid" as FormLayoutOptions);
    const direction = formStyleOptions.formDirection || ("row" as FormDirectionOptions);
    const enableSearch = formStyleOptions.formEnableSearch || false;
    const dynamicStyleOptions = unifiedLayoutProps.dynamicStyleOptions;
    const density = dynamicStyleOptions.density || "normal";
    const animationPreset = dynamicStyleOptions.animationPreset || "smooth";
    const variant = dynamicStyleOptions.variant || "default";
    const size = dynamicStyleOptions.size || "default";
    const unifiedCrudHandlers = unifiedLayoutProps.unifiedCrudHandlers;
    const className = unifiedLayoutProps.className;
    const containerSpacing = densityConfig[density].spacing;
    const densityStyles = spacingConfig[density];
    const currentStep = unifiedLayoutProps.unifiedStepHandlers?.currentStep;
    const onNextStep = unifiedLayoutProps.unifiedStepHandlers?.onNextStep;
    const onPrevStep = unifiedLayoutProps.unifiedStepHandlers?.onPrevStep;
    const formRef = React.useRef<HTMLDivElement>(null);

    // Combine native and relationship fields for layouts that need all fields
    const allRenderedFields = useMemo(() => [
        ...visibleNativeFields.map(getNativeFieldComponent),
        ...visibleRelationshipFields.map(getRelationshipFieldComponent)
    ], [visibleNativeFields, visibleRelationshipFields, getNativeFieldComponent, getRelationshipFieldComponent]);

    const getGridColumns = (columns: GridColumnOptions, fieldCount: number) => {
        if (typeof columns === "object" && "xs" in columns) {
            return `grid-cols-${columns.xs} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} xl:grid-cols-${columns.xl}`;
        }

        let colValue = columns;

        if (colValue === "auto") {
            if (fieldCount < 7) colValue = 1;
            else if (fieldCount <= 9) colValue = 2;
            else if (fieldCount <= 11) colValue = 3;
            else if (fieldCount <= 13) colValue = 4;
            else if (fieldCount <= 15) colValue = 5;
            else colValue = 6;
        }

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
    };

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

    const renderLayout = () => {
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
    };

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
                {enableSearch && (
                    <div className={cn("mb-4", densityStyles.gap)}>
                        <EntitySearchInput
                            entityKey={entityKey}
                            fieldDisplayNames={fieldDisplayNames}
                            allowedFields={allowedFields}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            density={density}
                            animationPreset={animationPreset}
                            size={size}
                            variant={variant}
                            className={densityStyles.inputSize}
                        />
                    </div>
                )}

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
                        renderLayout()
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