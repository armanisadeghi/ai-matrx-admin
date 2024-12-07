'use client';

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/styles/themes/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { selectEntityPrettyName } from "@/lib/redux/schema/globalCacheSelectors";
import {
    cardVariants,
    containerVariants,
    densityConfig,
    getAnimationVariants,
} from "@/config/ui/entity-layout-config";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { EntitySearchInput, EntityButton } from "@/components/matrx/ArmaniForm/field-components";
import EntityBaseField from "@/components/matrx/ArmaniForm/EntityBaseField";
import EntityRelationshipWrapper from "@/components/matrx/ArmaniForm/EntityRelationshipWrapper";
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
    ZigzagLayout
} from "@/components/matrx/ArmaniForm/FormLayouts";
import { EntityStateField } from "@/lib/redux/entity/types/stateTypes";
import { GridColumnOptions } from "@/types/componentConfigTypes";
import { EntityData } from "@/types/entityTypes";

export const SmartArmaniForm: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity;
    const formRef = useRef<HTMLDivElement>(null);
    const entityPrettyName = useAppSelector((state: RootState) => selectEntityPrettyName(state, selectedEntity));

    // Local state
    const [currentStep, setCurrentStep] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);
    const [formData, setFormData] = useState<EntityData<typeof selectedEntity>>({});

    const {
        density = 'normal',
        animationPreset,
        variant,
        size
    } = unifiedLayoutProps.dynamicStyleOptions;

    const {
        formStyleOptions: {
            splitRatio,
            floatingLabel,
            formLayout: layout = 'grid',
            formColumns: columns,
            formDirection: direction,
            formEnableSearch: enableSearch,
            formIsSinglePage: isSinglePage = true,
            formIsFullPage: isFullPage,
            fieldFiltering
        }
    } = unifiedLayoutProps.dynamicLayoutOptions;

    const handleFieldUpdate = (fieldName: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const onNextStep = () => {
        setCurrentStep(prev => Math.min(prev + 1, dynamicFieldInfo.length - 1));
    };

    const onPrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const filterFields = (fields: EntityStateField[]) => {
        if (!fields) return [];

        let filteredFields = fields;

        // Apply field filtering if configured
        if (fieldFiltering) {
            if (fieldFiltering.includeFields) {
                filteredFields = fields.filter(field =>
                    fieldFiltering.includeFields?.includes(field.name)
                );
            } else if (fieldFiltering.excludeFields) {
                filteredFields = fields.filter(field =>
                    !fieldFiltering.excludeFields?.includes(field.name)
                );
            }
        }

        // Apply search filtering if enabled and there's a search term
        if (enableSearch && searchTerm) {
            filteredFields = filteredFields.filter(field =>
                field.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                field.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filteredFields;
    };

    const renderField = (fieldInfo: EntityStateField) => {
        const commonProps = {
            entityKey: selectedEntity,
            dynamicFieldInfo: fieldInfo,
            value: formData[fieldInfo.name] || '',
            onChange: handleFieldUpdate,
            density,
            animationPreset,
            size,
            variant,
            floatingLabel,
        };

        return fieldInfo.isNative ?
               <EntityBaseField {...commonProps} /> :
               <EntityRelationshipWrapper {...commonProps} formData={formData} />;
    };

    // Existing getGridColumns implementation
    const getGridColumns = (columns: GridColumnOptions, dynamicFieldInfo: any[]) => {
        if (typeof columns === 'object' && 'xs' in columns) {
            return `grid-cols-${columns.xs} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} xl:grid-cols-${columns.xl}`;
        }

        let colValue = columns;

        if (colValue === 'auto') {
            const fieldCount = dynamicFieldInfo.length;

            if (fieldCount < 7) colValue = 1;
            else if (fieldCount <= 9) colValue = 2;
            else if (fieldCount <= 11) colValue = 3;
            else if (fieldCount <= 13) colValue = 4;
            else if (fieldCount <= 15) colValue = 5;
            else colValue = 6;
        }

        switch (colValue) {
            case 1:
                return 'grid-cols-1';
            case 2:
                return 'grid-cols-1 sm:grid-cols-2';
            case 3:
                return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
            case 4:
                return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
            case 5:
                return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
            case 6:
                return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
            default:
                return 'grid-cols-1';
        }
    };

    const getFlexDirection = () => {
        switch (direction) {
            case 'row':
                return 'flex-row';
            case 'row-reverse':
                return 'flex-row-reverse';
            case 'column':
                return 'flex-col';
            case 'column-reverse':
                return 'flex-col-reverse';
            default:
                return 'flex-row';
        }
    };

    const renderLayout = () => {
        const filteredFields = filterFields(dynamicFieldInfo);

        const commonProps = {
            filteredFields,
            renderField,
            density,
            densityStyles: densityConfig[density].spacing,
            containerSpacing: densityConfig[density].spacing,
            getGridColumns: () => getGridColumns(columns, filteredFields),
            getFlexDirection,
            animationPreset,
            containerVariants,
            cardVariants,
            carouselActiveIndex,
            setCarouselActiveIndex
        };

        const layouts = {
            sections: SectionsLayout,
            accordion: AccordionLayout,
            tabs: TabsLayout,
            masonry: MasonryLayout,
            carousel: CarouselLayout,
            timeline: TimelineLayout,
            TrialFloatingLayout,
            TrialListGroupLayout,
            TrialSplitLayout,
            TrialCardListLayout,
            ZigzagLayout,
            TrialStackedLayout,
            TrialFieldTabsLayout,
            grid: GridLayout
        };

        const SelectedLayout = layouts[layout] || GridLayout;
        return <SelectedLayout {...commonProps} />;
    };

    if (!selectedEntity || !dynamicFieldInfo) return null;

    return (
        <motion.div
            ref={formRef}
            className={cn(
                "bg-card rounded-lg",
                isFullPage ? "w-full h-full" : "max-w-md mx-auto mt-2 shadow-xl",
                densityConfig[density].padding.md,
                unifiedLayoutProps.className
            )}
            variants={containerVariants[animationPreset]}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    unifiedLayoutProps.unifiedCrudHandlers?.handleUpdate?.(formData);
                }}
                className={cn("h-full", densityConfig[density].spacing.container)}
            >
                {enableSearch && (
                    <EntitySearchInput
                        dynamicFieldInfo={dynamicFieldInfo}
                        onSearchChange={setSearchTerm}
                        density={density}
                        animationPreset={animationPreset}
                        size={size}
                        variant={variant}
                        className={densityConfig[density].spacing.inputSize}
                    />
                )}

                <div className={cn(
                    isFullPage ? "h-[calc(100%-4rem)] overflow-y-auto" : "",
                    densityConfig[density].spacing.section
                )}>
                    {isSinglePage ? renderLayout() : (
                        <>
                            <motion.h2
                                className={cn(
                                    "font-bold mb-4 text-foreground",
                                    isFullPage ? "text-3xl" : "text-2xl",
                                    densityConfig[density].fontSize
                                )}
                                variants={cardVariants[animationPreset]}
                            >
                                {dynamicFieldInfo[currentStep].componentProps.displayName}
                            </motion.h2>

                            <AnimatePresence mode="sync">
                                <motion.div
                                    key={currentStep}
                                    variants={getAnimationVariants(animationPreset)}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                >
                                    {renderField(dynamicFieldInfo[currentStep])}
                                </motion.div>
                            </AnimatePresence>
                        </>
                    )}
                </div>

                <motion.div
                    className={cn("flex justify-between", densityConfig[density].spacing.gap)}
                    variants={cardVariants[animationPreset]}
                >
                    {!isSinglePage && (
                        <EntityButton
                            onClick={onPrevStep}
                            disabled={currentStep === 0}
                            className={cn(
                                "space-y-6 bg-secondary text-secondary-foreground",
                                densityConfig[density].spacing.buttonSize
                            )}
                        >
                            Previous
                        </EntityButton>
                    )}
                    {isSinglePage || currentStep === dynamicFieldInfo.length - 1 ? (
                        <EntityButton type="submit" className="bg-primary text-primary-foreground">
                            Submit
                        </EntityButton>
                    ) : (
                         <EntityButton
                             onClick={onNextStep}
                             className="bg-primary text-primary-foreground"
                         >
                             Next
                         </EntityButton>
                     )}
                </motion.div>
            </form>

            {!isSinglePage && (
                <motion.div
                    className={cn(
                        "mt-4 text-muted-foreground",
                        densityConfig[density].fontSize
                    )}
                    variants={cardVariants[animationPreset]}
                >
                    Step {currentStep + 1} of {dynamicFieldInfo.length}
                </motion.div>
            )}
        </motion.div>
    );
};

export default SmartArmaniForm;
