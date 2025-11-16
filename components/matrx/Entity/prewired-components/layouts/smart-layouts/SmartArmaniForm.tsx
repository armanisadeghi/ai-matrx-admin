'use client';

import React, {useRef, useState} from "react";
import {motion, AnimatePresence} from "motion/react";
import {cn} from "@/styles/themes/utils";
import {useAppSelector} from "@/lib/redux/hooks";
import {RootState} from "@/lib/redux/store";
import {selectEntityPrettyName} from "@/lib/redux/schema/globalCacheSelectors";
import {
    cardVariants,
    containerVariants,
    densityConfig,
    spacingConfig,
    getAnimationVariants,
} from "@/config/ui/entity-layout-config";
import {UnifiedLayoutProps} from "@/components/matrx/Entity";
import {EntitySearchInput, EntityButton} from "@/components/matrx/ArmaniForm/field-components";
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
import {GridColumnOptions} from "@/types/componentConfigTypes";
import {EntityData, MatrxRecordId} from "@/types/entityTypes";
import { ShadowWrapper } from "@/components/ShadowWrapper";
import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useFieldVisibility } from "@/app/entities/hooks/form-related/useFieldVisibility";
import { useFieldRenderer } from "@/app/entities/hooks/form-related/useFieldRenderer";
import { useFieldConfiguration } from "@/app/entities/hooks/form-related/useFieldConfiguration";

interface SmartArmaniFormProps extends UnifiedLayoutProps {
    recordId?: MatrxRecordId;
}

export const SmartArmaniForm: React.FC<SmartArmaniFormProps> = (props) => {
    const { recordId: propRecordId, ...unifiedLayoutProps } = props;
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity;
    const formRef = useRef<HTMLDivElement>(null);
    const entityPrettyName = useAppSelector((state: RootState) => selectEntityPrettyName(state, selectedEntity));

    const { activeRecordCrud, getEffectiveRecordOrDefaults } = useEntityCrud(selectedEntity);
    
    // Use provided recordId or fall back to active record
    const effectiveRecordId = propRecordId || activeRecordCrud.recordId;

    const {
        visibleFields,
        visibleNativeFields,
        visibleRelationshipFields,
        searchTerm,
        setSearchTerm,
        carouselActiveIndex,
        setCarouselActiveIndex,
        isSearchEnabled,
    } = useFieldVisibility(selectedEntity, unifiedLayoutProps);

    // Get field configuration for search placeholders
    const { allowedFields, fieldDisplayNames } = useFieldConfiguration(selectedEntity, unifiedLayoutProps);

    const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer(
        selectedEntity, 
        effectiveRecordId, 
        unifiedLayoutProps
    );

    // Local state
    const [currentStep, setCurrentStep] = useState(0);
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

    // Combine native and relationship fields for layouts
    const allRenderedFields = React.useMemo(() => [
        ...visibleNativeFields.map(getNativeFieldComponent),
        ...visibleRelationshipFields.map(getRelationshipFieldComponent)
    ], [visibleNativeFields, visibleRelationshipFields, getNativeFieldComponent, getRelationshipFieldComponent]);

    const onNextStep = () => {
        setCurrentStep(prev => Math.min(prev + 1, allRenderedFields.length - 1));
    };

    const onPrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    // Existing getGridColumns implementation
    const getGridColumns = (columns: GridColumnOptions, fieldCount: number) => {
        if (typeof columns === 'object' && 'xs' in columns) {
            return `grid-cols-${columns.xs} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} xl:grid-cols-${columns.xl}`;
        }

        let colValue = columns;

        if (colValue === 'auto') {
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
        const commonProps = {
            filteredFields: allRenderedFields,
            renderField: null, // No longer needed - fields are already rendered
            density,
            densityStyles: spacingConfig[density],
            containerSpacing: densityConfig[density].spacing,
            getGridColumns: () => getGridColumns(columns, allRenderedFields.length),
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

    if (!selectedEntity) return null;

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
            <ShadowWrapper>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        unifiedLayoutProps.unifiedCrudHandlers?.handleUpdate?.(formData);
                    }}
                    className={cn("h-full", spacingConfig[density].container)}
                >
                    {enableSearch && (
                        <EntitySearchInput
                            entityKey={selectedEntity}
                            fieldDisplayNames={fieldDisplayNames}
                            allowedFields={allowedFields}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            density={density}
                            animationPreset={animationPreset}
                            size={size}
                            variant={variant}
                            className={spacingConfig[density].inputSize}
                        />
                    )}

                    <div className={cn(
                        isFullPage ? "h-[calc(100%-4rem)] overflow-y-auto" : "",
                        spacingConfig[density].section
                    )}>
                        {isSinglePage ? renderLayout() : (
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
                    </div>

                    <motion.div
                        className={cn("flex justify-between", spacingConfig[density].gap)}
                        variants={cardVariants[animationPreset]}
                    >
                        {!isSinglePage && allRenderedFields.length > 0 && (
                            <EntityButton
                                onClick={onPrevStep}
                                disabled={currentStep === 0}
                                className={cn(
                                    "space-y-6 bg-secondary text-secondary-foreground",
                                    spacingConfig[density].buttonSize
                                )}
                            >
                                Previous
                            </EntityButton>
                        )}
                        {isSinglePage || (allRenderedFields.length > 0 && currentStep === allRenderedFields.length - 1) ? (
                            <EntityButton type="submit" className="bg-primary text-primary-foreground">
                                Submit
                            </EntityButton>
                        ) : (
                             allRenderedFields.length > 0 && (
                                <EntityButton
                                    onClick={onNextStep}
                                    className="bg-primary text-primary-foreground"
                                >
                                    Next
                                </EntityButton>
                             )
                         )}
                    </motion.div>
                </form>
            </ShadowWrapper>

            {!isSinglePage && allRenderedFields.length > 0 && (
                <motion.div
                    className={cn(
                        "mt-4 text-muted-foreground",
                        densityConfig[density].fontSize
                    )}
                    variants={cardVariants[animationPreset]}
                >
                    Step {currentStep + 1} of {allRenderedFields.length}
                </motion.div>
            )}
        </motion.div>
    );
};

export default SmartArmaniForm;
