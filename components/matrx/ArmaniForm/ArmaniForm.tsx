"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/styles/themes/utils";
import { EntityButton, EntitySearchInput } from "./field-components";
import { cardVariants, containerVariants, densityConfig, spacingConfig, getAnimationVariants } from "@/config/ui/entity-layout-config";
import EntityBaseField, { EntityBaseFieldProps } from "./EntityBaseField";
import { EntityStateField } from "@/lib/redux/entity/types/stateTypes";
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
import EntityRelationshipWrapper from "./EntityRelationshipWrapper";
import SmartCrudButtons from "../Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import { FormColumnsOptions, FormDirectionOptions, GridColumnOptions, FormLayoutOptions } from "@/types/componentConfigTypes";
import { UnifiedLayoutProps } from "../Entity";
import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useFieldVisibility } from "@/app/entities/hooks/form-related/useFieldVisibility";
import { useAppSelector } from "@/lib/redux/hooks";
import { createEntitySelectors } from "@/lib/redux/entity/selectors";
import { EntityAnyFieldKey } from "@/types/entityTypes";

export interface FormState {
    [key: string]: any;
}

export type FormDensity = "normal" | "compact" | "comfortable";

const ArmaniForm: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const { activeRecordCrud, getEffectiveRecord } = useEntityCrud(entityKey);
    const recordData = activeRecordCrud.recordData;

    // Create selectors for converting field names to EntityStateField objects
    const selectors = useMemo(() => entityKey ? createEntitySelectors(entityKey) : null, [entityKey]);

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

    // Convert field names to EntityStateField objects
    const visibleFieldsAsObjects = useAppSelector(state => {
        if (!selectors || !visibleFields.length) return [];
        
        return visibleFields.map(fieldName => 
            selectors.selectFieldMetadata(state, fieldName as string)
        ).filter(Boolean) as EntityStateField[];
    });

    const currentRecordData = activeRecordCrud.recordId ? getEffectiveRecord(activeRecordCrud.recordId) : {};

    const dynamicLayoutOptions = unifiedLayoutProps.dynamicLayoutOptions;
    const formStyleOptions = dynamicLayoutOptions.formStyleOptions || {};
    const isSinglePage = formStyleOptions.formIsSinglePage || false;
    const isFullPage = formStyleOptions.formIsFullPage || false;
    const columns = formStyleOptions.formColumns || (1 as FormColumnsOptions);
    const layout = formStyleOptions.formLayout || ("grid" as FormLayoutOptions);
    const direction = formStyleOptions.formDirection || ("row" as FormDirectionOptions);
    const enableSearch = formStyleOptions.formEnableSearch || false;
    const floatingLabel = formStyleOptions.floatingLabel ?? true;

    const dynamicStyleOptions = unifiedLayoutProps.dynamicStyleOptions;
    const density = dynamicStyleOptions.density || "normal";
    const animationPreset = dynamicStyleOptions.animationPreset || "smooth";
    const variant = dynamicStyleOptions.variant || "default";
    const size = dynamicStyleOptions.size || "default";
    const unifiedCrudHandlers = unifiedLayoutProps.unifiedCrudHandlers;
    const onUpdateField = unifiedCrudHandlers?.handleFieldUpdate;
    const onSubmitUpdate = unifiedCrudHandlers?.handleUpdate;
    const onSubmitCreate = unifiedCrudHandlers?.handleCreate;
    const onSubmitDelete = unifiedCrudHandlers?.handleDelete;

    const className = unifiedLayoutProps.className;
    const containerSpacing = densityConfig[density].spacing;
    const densityStyles = spacingConfig[density];
    const currentStep = unifiedLayoutProps.unifiedStepHandlers?.currentStep;
    const onNextStep = unifiedLayoutProps.unifiedStepHandlers?.onNextStep;
    const onPrevStep = unifiedLayoutProps.unifiedStepHandlers?.onPrevStep;
    const animationVariants = getAnimationVariants(animationPreset);
    const formRef = React.useRef<HTMLDivElement>(null);

    // Use the converted field objects
    const filteredFields = visibleFieldsAsObjects;

    const renderField = (dynamicFieldInfo: EntityStateField) => {
        const commonProps: EntityBaseFieldProps = {
            entityKey,
            dynamicFieldInfo,
            value: recordData[dynamicFieldInfo.name] || "",
            onChange: (value: any) => onUpdateField(dynamicFieldInfo.name, value),
            density,
            animationPreset,
            size,
            variant,
            floatingLabel,
        };

        if (dynamicFieldInfo.isNative) {
            return <EntityBaseField {...commonProps} />;
        } else {
            return <EntityRelationshipWrapper {...commonProps} currentRecordData={recordData} />;
        }
    };

    const getGridColumns = (columns: GridColumnOptions, fields: EntityStateField[]) => {
        if (typeof columns === "object" && "xs" in columns) {
            return `grid-cols-${columns.xs} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} xl:grid-cols-${columns.xl}`;
        }

        let colValue = columns;

        if (colValue === "auto") {
            const fieldCount = fields.length;

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
            filteredFields,
            renderField,
            density,
            densityStyles,
            containerSpacing,
            getGridColumns: () => getGridColumns(columns, filteredFields),
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
                    <EntitySearchInput
                        dynamicFieldInfo={filteredFields}
                        onSearchChange={setSearchTerm}
                        density={density}
                        animationPreset={animationPreset}
                        size={size}
                        variant={variant}
                        className={densityStyles.inputSize}
                    />
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
                            {filteredFields.length > 0 && currentStep < filteredFields.length && (
                                <>
                                    <motion.h2
                                        className={cn(
                                            "font-bold mb-4 text-foreground",
                                            isFullPage ? "text-3xl" : "text-2xl",
                                            densityConfig[density].fontSize
                                        )}
                                        variants={cardVariants[animationPreset]}
                                    >
                                        {filteredFields[currentStep]?.componentProps?.displayName || filteredFields[currentStep]?.displayName}
                                    </motion.h2>

                                    <AnimatePresence mode="sync">
                                        <motion.div
                                            key={currentStep}
                                            variants={getAnimationVariants(animationPreset)}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                        >
                                            {renderField(filteredFields[currentStep])}
                                        </motion.div>
                                    </AnimatePresence>
                                </>
                            )}
                        </>
                    )}

                    {filteredFields.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No fields available to display
                        </div>
                    )}
                </div>

                <motion.div className={cn("flex justify-between", densityStyles.gap)} variants={cardVariants[animationPreset]}>
                    {/* Button components with density-aware styling */}
                    {!isSinglePage && filteredFields.length > 0 && (
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
                    {(isSinglePage || (filteredFields.length > 0 && currentStep === filteredFields.length - 1)) ? (
                        <EntityButton type="submit" className="bg-primary text-primary-foreground">
                            Submit
                        </EntityButton>
                    ) : (
                        filteredFields.length > 0 && (
                            <EntityButton
                                onClick={() => {
                                    if (currentStep < filteredFields.length - 1) onNextStep();
                                }}
                                className="bg-primary text-primary-foreground"
                            >
                                Next
                            </EntityButton>
                        )
                    )}
                </motion.div>
            </form>

            {!isSinglePage && filteredFields.length > 0 && (
                <motion.div
                    className={cn("mt-4 text-muted-foreground", densityConfig[density].fontSize)}
                    variants={cardVariants[animationPreset]}
                >
                    Step {currentStep + 1} of {filteredFields.length}
                </motion.div>
            )}
        </motion.div>
    );
};

export default ArmaniForm;